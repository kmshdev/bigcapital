// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('HomepageContent restricted operating scope', () => {
  it('does not render the products, services, and inventory section', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'HomepageContent.tsx'),
      'utf8',
    );

    expect(source).not.toContain('ProductsServicesSection');
    expect(source).not.toContain('products_services_inventory');
  });
});
