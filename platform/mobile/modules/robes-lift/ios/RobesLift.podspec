Pod::Spec.new do |s|
  s.name           = 'RobesLift'
  s.version        = '1.0.0'
  s.summary        = 'Lifts the pieces out of a photograph on the device.'
  s.description    = 'Wraps Vision foreground instance masks (iOS 17+) and writes every lifted item into one PNG.'
  s.license        = 'UNLICENSED'
  s.author         = 'Robes'
  s.homepage       = 'https://www.byrobes.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'CoreVideo', 'ImageIO', 'UniformTypeIdentifiers'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
