import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { blurhashToDataUrl } from './blurhash';
import { Image } from './image';

const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

function fakeCanvas() {
  const putImageData = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData,
      }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA');
  return putImageData;
}

describe('Image', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reserves a fixed aspect frame before the image loads, then fades it in', () => {
    const { container } = render(
      <Image
        src="/a.webp"
        srcSet="/a-400.webp 400w, /a-800.webp 800w"
        sizes="50vw"
        alt="Linen shirt"
        aspect="4:5"
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame).toHaveClass('aspect-4/5', 'relative', 'overflow-hidden');
    const img = screen.getByRole('img', { name: 'Linen shirt' });
    expect(img).toHaveAttribute('srcset', '/a-400.webp 400w, /a-800.webp 800w');
    expect(img).toHaveAttribute('sizes', '50vw');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('opacity-0');
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
    expect(frame).toHaveAttribute('data-status', 'loaded');
  });

  it('decodes a blurhash to a tiny data URL placeholder and removes it once loaded', () => {
    const putImageData = fakeCanvas();
    const { container } = render(<Image src="/b.webp" alt="Look" blurhash={HASH} priority />);
    expect(putImageData).toHaveBeenCalled();
    const placeholder = container.querySelector('img[aria-hidden]');
    expect(placeholder).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    const img = screen.getByRole('img', { name: 'Look' });
    expect(img).toHaveAttribute('loading', 'eager');
    fireEvent.load(img);
    expect(container.querySelector('img[aria-hidden]')).toBeNull();
  });

  it('ignores invalid hashes', () => {
    expect(blurhashToDataUrl('not-a-hash')).toBeNull();
  });

  it('keeps the frame when the image fails', () => {
    const { container } = render(<Image src="/missing.webp" alt="Missing" aspect="1:1" />);
    fireEvent.error(screen.getByRole('img', { name: 'Missing' }));
    expect(container.firstElementChild).toHaveAttribute('data-status', 'error');
    expect(container.firstElementChild).toHaveClass('aspect-square');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Image src="/c.webp" alt="A camel coat" aspect="3:4" />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
