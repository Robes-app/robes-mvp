import { describe, expect, it } from 'vitest';
import { parseProduct } from './product';

const url = 'https://www.shop.example/p/coat';

describe('parseProduct', () => {
  it('reads a JSON-LD Product (inside @graph) with its offer and brand', () => {
    const html = `<html><head><title>Coat | Shop</title>
      <script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":"Product","name":"Double-faced wool coat","brand":{"@type":"Brand","name":"Toteme"},"image":["/img/coat.jpg"],"offers":{"@type":"Offer","price":"650.00","priceCurrency":"eur"}}]}</script>
      </head></html>`;
    expect(parseProduct(html, url)).toEqual({
      label: 'Double-faced wool coat',
      brand: 'Toteme',
      price: 650,
      currency: 'EUR',
      imageUrl: 'https://www.shop.example/img/coat.jpg',
      sourceUrl: url,
      retailer: 'shop.example',
      title: 'Coat | Shop',
    });
  });

  it('falls back to Open Graph and decodes entities', () => {
    const html = `<meta property="og:title" content="Silk &amp; linen shirt">
      <meta property="og:site_name" content="Arket"><meta property="product:price:amount" content="89">
      <meta property="product:price:currency" content="GBP"><meta property="og:image" content="https://cdn.arket.test/s.jpg">`;
    expect(parseProduct(html, url)).toMatchObject({
      label: 'Silk & linen shirt',
      retailer: 'Arket',
      price: 89,
      currency: 'GBP',
      imageUrl: 'https://cdn.arket.test/s.jpg',
    });
  });

  it('ignores broken JSON-LD, non-http images and bad currencies; null without a name', () => {
    const html = `<script type="application/ld+json">{broken</script>
      <meta property="og:title" content="Loafers"><meta property="og:image" content="javascript:alert(1)">
      <meta property="product:price:currency" content="euros">`;
    expect(parseProduct(html, url)).toMatchObject({
      label: 'Loafers',
      imageUrl: null,
      currency: null,
    });
    expect(parseProduct('<p>nothing here</p>', url)).toBeNull();
  });
});
