import CoreGraphics
import CoreVideo
import ExpoModulesCore
import ImageIO
import UIKit
import UniformTypeIdentifiers
import Vision

// Lifts the pieces out of a photograph, on the phone (cutout brief, 21 Nov 2026).
//
// Apple's subject lifting (Vision foreground instance masks, iOS 17+) finds each thing that
// stands out of a photo. The off-the-shelf wrappers return one cutout of everything together;
// Robes needs each item apart, because the server decides which item is which piece from the
// boxes its read returns. So this writes ONE PNG, "the lift", the size of the upright photo:
//
//   red   = which lifted item the pixel belongs to, as its number × 16 (0: nothing lifted)
//   green = how much of the pixel is that item, 0–255 (the soft edge)
//
// The format is read by decodeLift in packages/media/src/cutout.ts; the numbers (16, at most 15
// items) are LIFT_LABEL_STEP and LIFT_MAX_ITEMS in packages/core/src/cutout. Nothing leaves the
// phone here: the app uploads the file beside the photo.
//
// Returns nil when there is nothing to lift or the phone cannot (iOS 16, the Simulator): the
// piece then keeps its rectangle, and nobody is told.
public class RobesLiftModule: Module {
  static let labelStep = 16
  static let maxItems = 15
  // Under this share of a pixel, nothing was lifted there.
  static let floor: Float = 0.05

  public func definition() -> ModuleDefinition {
    Name("RobesLift")

    AsyncFunction("lift") { (uri: String, maxEdge: Int) -> [String: Any]? in
      guard #available(iOS 17.0, *) else { return nil }
      guard let url = URL(string: uri), let photo = UIImage(contentsOfFile: url.path) else {
        return nil
      }
      let started = CFAbsoluteTimeGetCurrent()
      guard let upright = Self.upright(photo, maxEdge: max(256, maxEdge)) else { return nil }
      guard let lifted = try? Self.lift(upright) else { return nil }
      guard let file = Self.write(lifted, width: upright.width, height: upright.height) else {
        return nil
      }
      return [
        "uri": file.absoluteString,
        "width": upright.width,
        "height": upright.height,
        "items": lifted.items,
        "ms": Int((CFAbsoluteTimeGetCurrent() - started) * 1000),
      ]
    }
  }

  // The photo as the server will see it: turned upright, its long edge at most `maxEdge`.
  static func upright(_ photo: UIImage, maxEdge: Int) -> CGImage? {
    let size = photo.size
    guard size.width > 0, size.height > 0 else { return nil }
    let scale = min(1, CGFloat(maxEdge) / max(size.width, size.height))
    let width = max(1, Int((size.width * scale).rounded()))
    let height = max(1, Int((size.height * scale).rounded()))
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(
      size: CGSize(width: width, height: height), format: format)
    // UIImage.draw applies the photo's orientation.
    let drawn = renderer.image { _ in
      photo.draw(in: CGRect(x: 0, y: 0, width: width, height: height))
    }
    return drawn.cgImage
  }

  struct Lifted {
    // RGBX, four bytes a pixel, row by row.
    var pixels: [UInt8]
    var items: Int
  }

  @available(iOS 17.0, *)
  static func lift(_ image: CGImage) throws -> Lifted? {
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    try handler.perform([request])
    guard let observation = request.results?.first else { return nil }
    let instances = Array(observation.allInstances.prefix(maxItems))
    guard !instances.isEmpty else { return nil }

    let width = image.width
    let height = image.height
    var best = [Float](repeating: 0, count: width * height)
    var label = [UInt8](repeating: 0, count: width * height)

    for (position, instance) in instances.enumerated() {
      // The item's soft mask at the photo's own size.
      let mask = try observation.generateScaledMaskForImage(
        forInstances: IndexSet(integer: instance), from: handler)
      CVPixelBufferLockBaseAddress(mask, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
      guard let base = CVPixelBufferGetBaseAddress(mask) else { continue }
      let maskWidth = CVPixelBufferGetWidth(mask)
      let maskHeight = CVPixelBufferGetHeight(mask)
      guard maskWidth == width, maskHeight == height else { continue }
      let rowBytes = CVPixelBufferGetBytesPerRow(mask)
      let format = CVPixelBufferGetPixelFormatType(mask)
      let item = UInt8(position + 1)
      for y in 0..<height {
        let row = base.advanced(by: y * rowBytes)
        if format == kCVPixelFormatType_OneComponent32Float {
          let values = row.assumingMemoryBound(to: Float.self)
          for x in 0..<width where values[x] > best[y * width + x] {
            best[y * width + x] = values[x]
            label[y * width + x] = item
          }
        } else if format == kCVPixelFormatType_OneComponent8 {
          let values = row.assumingMemoryBound(to: UInt8.self)
          for x in 0..<width {
            let value = Float(values[x]) / 255
            if value > best[y * width + x] {
              best[y * width + x] = value
              label[y * width + x] = item
            }
          }
        }
      }
    }

    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    var any = false
    for p in 0..<(width * height) {
      pixels[p * 4 + 3] = 255
      let value = best[p]
      guard value >= floor else { continue }
      any = true
      pixels[p * 4] = label[p] * UInt8(labelStep)
      pixels[p * 4 + 1] = UInt8(max(0, min(255, (value * 255).rounded())))
    }
    return any ? Lifted(pixels: pixels, items: instances.count) : nil
  }

  // The lift as a PNG in the app's caches; the app deletes it once it is uploaded.
  static func write(_ lifted: Lifted, width: Int, height: Int) -> URL? {
    guard let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    var pixels = lifted.pixels
    let image: CGImage? = pixels.withUnsafeMutableBytes { raw in
      guard
        let context = CGContext(
          data: raw.baseAddress, width: width, height: height, bitsPerComponent: 8,
          bytesPerRow: width * 4, space: space,
          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
      else { return nil }
      return context.makeImage()
    }
    guard let image else { return nil }
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    guard let directory else { return nil }
    let file = directory.appendingPathComponent("robes-lift-\(UUID().uuidString).png")
    guard
      let destination = CGImageDestinationCreateWithURL(
        file as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { return nil }
    CGImageDestinationAddImage(destination, image, nil)
    return CGImageDestinationFinalize(destination) ? file : nil
  }
}
