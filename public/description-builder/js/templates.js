/* ====== Template Presets: 5 ecommerce description styles ====== */
window.TemplatePresets = [

  /* ──────────────────────────────────────────────
     1. Classic Product Showcase
     Hero image + headline + features grid + specs
     ────────────────────────────────────────────── */
  {
    id: 'classic-showcase',
    name: 'Classic Product Showcase',
    description: 'A clean, professional layout with a hero image, headline, feature cards, and a full specs table. Perfect for general merchandise and equipment.',
    preview: {
      accent: '#6366f1',
      layout: ['image', 'header', 'text', 'features', 'specs', 'cta']
    },
    blocks: [
      { id: '_t1a', type: 'image', data: { src: '', alt: 'Product hero image', width: '100%' } },
      { id: '_t1b', type: 'header', data: { level: 'h1', text: 'Product Name' } },
      { id: '_t1c', type: 'text', data: { html: '<p>Introduce the product with a compelling summary. Highlight the key value proposition and what makes this product stand out from the competition.</p>' } },
      { id: '_t1d', type: 'divider', data: { style: 'line', height: 24 } },
      { id: '_t1e', type: 'features', data: { items: [
        { title: 'Durable Construction', text: 'Built to last with premium materials' },
        { title: 'Easy Setup', text: 'Ready to use in minutes, no tools required' },
        { title: 'Versatile Design', text: 'Fits a wide range of applications' },
        { title: 'Warranty Included', text: 'Backed by our satisfaction guarantee' }
      ]}},
      { id: '_t1f', type: 'specs', data: { title: 'Specifications', rows: [
        { label: 'Dimensions', value: '' },
        { label: 'Weight', value: '' },
        { label: 'Material', value: '' },
        { label: 'Color', value: '' },
        { label: 'Warranty', value: '' }
      ]}},
      { id: '_t1g', type: 'cta', data: { text: 'Add to Cart', url: '', style: 'green' } }
    ]
  },

  /* ──────────────────────────────────────────────
     2. Comparison & Selection
     Side-by-side comparison chart with model options
     ────────────────────────────────────────────── */
  {
    id: 'comparison-selection',
    name: 'Comparison & Selection',
    description: 'Ideal for products with multiple models or variants. Features a comparison chart, model/option selector, and key highlights to help buyers choose.',
    preview: {
      accent: '#f59e0b',
      layout: ['header', 'text', 'comparison', 'models', 'cta']
    },
    blocks: [
      { id: '_t2a', type: 'header', data: { level: 'h1', text: 'Choose Your Model' } },
      { id: '_t2b', type: 'text', data: { html: '<p>Compare models side-by-side to find the perfect fit for your needs. Each option is designed for a specific use case.</p>' } },
      { id: '_t2c', type: 'comparison', data: {
        columns: ['Feature', 'Standard', 'Pro', 'Elite'],
        rows: [
          ['Capacity', '', '', ''],
          ['Material', '', '', ''],
          ['Weight', '', '', ''],
          ['Warranty', '1 Year', '2 Years', '5 Years'],
          ['Price', '', '', '']
        ]
      }},
      { id: '_t2d', type: 'divider', data: { style: 'space', height: 16 } },
      { id: '_t2e', type: 'models', data: {
        title: 'Available Options',
        items: [
          { label: 'Standard', url: '' },
          { label: 'Pro', url: '' },
          { label: 'Elite', url: '' }
        ]
      }},
      { id: '_t2f', type: 'features', data: { items: [
        { title: 'Free Shipping', text: 'On all orders over $99' },
        { title: 'Easy Returns', text: '30-day hassle-free returns' }
      ]}},
      { id: '_t2g', type: 'cta', data: { text: 'View All Models', url: '', style: 'dark' } }
    ]
  },

  /* ──────────────────────────────────────────────
     3. Visual Storyteller
     Image-heavy 2-column layout with alternating media/text
     ────────────────────────────────────────────── */
  {
    id: 'visual-storyteller',
    name: 'Visual Storyteller',
    description: 'A media-rich, editorial-style layout that alternates images and text in two columns. Great for lifestyle products, apparel, and brands with strong visuals.',
    preview: {
      accent: '#ec4899',
      layout: ['header', 'twocol', 'twocol', 'video', 'cta']
    },
    blocks: [
      { id: '_t3a', type: 'header', data: { level: 'h1', text: 'Product Story' } },
      { id: '_t3b', type: 'text', data: { html: '<p>Set the scene with an aspirational opening that connects with your target customer. Paint a picture of the lifestyle this product enables.</p>' } },
      { id: '_t3c', type: 'divider', data: { style: 'space', height: 8 } },
      { id: '_t3d', type: 'twocol', data: {
        left: [
          { id: '_t3d1', type: 'image', data: { src: '', alt: 'Product in use', width: '100%' } }
        ],
        right: [
          { id: '_t3d2', type: 'header', data: { level: 'h3', text: 'Designed for Everyday Use' } },
          { id: '_t3d3', type: 'text', data: { html: '<p>Describe the first key selling point. Focus on how the product solves a real problem or enhances the customer\'s daily routine.</p>' } }
        ]
      }},
      { id: '_t3e', type: 'twocol', data: {
        left: [
          { id: '_t3e1', type: 'header', data: { level: 'h3', text: 'Premium Quality Materials' } },
          { id: '_t3e2', type: 'text', data: { html: '<p>Detail the craftsmanship, materials, or technology that sets this product apart. Customers want to know what they\'re paying for.</p>' } }
        ],
        right: [
          { id: '_t3e3', type: 'image', data: { src: '', alt: 'Close-up detail shot', width: '100%' } }
        ]
      }},
      { id: '_t3f', type: 'divider', data: { style: 'line', height: 24 } },
      { id: '_t3g', type: 'video', data: { url: '' } },
      { id: '_t3h', type: 'cta', data: { text: 'Shop Now', url: '', style: 'dark' } }
    ]
  },

  /* ──────────────────────────────────────────────
     4. Technical Deep-Dive
     Specs-heavy layout for industrial / technical products
     ────────────────────────────────────────────── */
  {
    id: 'technical-deep-dive',
    name: 'Technical Deep-Dive',
    description: 'A specs-first layout built for technical and industrial products. Leads with key data, includes multiple spec tables, a comparison chart, and downloadable resources.',
    preview: {
      accent: '#14b8a6',
      layout: ['header', 'features', 'specs', 'specs', 'comparison', 'cta']
    },
    blocks: [
      { id: '_t4a', type: 'header', data: { level: 'h1', text: 'Technical Overview' } },
      { id: '_t4b', type: 'text', data: { html: '<p>Provide a concise technical summary of the product. Engineers, buyers, and procurement teams need the facts fast.</p>' } },
      { id: '_t4c', type: 'features', data: { items: [
        { title: 'Load Rating', text: 'Certified to handle up to X lbs' },
        { title: 'Operating Temp', text: 'Rated for -20F to 150F environments' },
        { title: 'Certifications', text: 'UL Listed, CE Marked, RoHS Compliant' },
        { title: 'Expected Lifespan', text: '10,000+ hours of operation' }
      ]}},
      { id: '_t4d', type: 'divider', data: { style: 'line', height: 24 } },
      { id: '_t4e', type: 'specs', data: { title: 'Physical Specifications', rows: [
        { label: 'Dimensions (L x W x H)', value: '' },
        { label: 'Net Weight', value: '' },
        { label: 'Shipping Weight', value: '' },
        { label: 'Housing Material', value: '' },
        { label: 'Finish', value: '' },
        { label: 'Color Options', value: '' }
      ]}},
      { id: '_t4f', type: 'specs', data: { title: 'Performance Specifications', rows: [
        { label: 'Voltage', value: '' },
        { label: 'Amperage', value: '' },
        { label: 'Power Consumption', value: '' },
        { label: 'Noise Level', value: '' },
        { label: 'Efficiency Rating', value: '' }
      ]}},
      { id: '_t4g', type: 'divider', data: { style: 'space', height: 8 } },
      { id: '_t4h', type: 'header', data: { level: 'h2', text: 'Model Comparison' } },
      { id: '_t4i', type: 'comparison', data: {
        columns: ['Specification', 'Model A', 'Model B'],
        rows: [
          ['Capacity', '', ''],
          ['Voltage', '', ''],
          ['Dimensions', '', ''],
          ['Weight', '', ''],
          ['Price', '', '']
        ]
      }},
      { id: '_t4j', type: 'models', data: {
        title: 'Related Models',
        items: [
          { label: 'Model A', url: '' },
          { label: 'Model B', url: '' }
        ]
      }},
      { id: '_t4k', type: 'cta', data: { text: 'Request a Quote', url: '', style: 'green' } }
    ]
  },

  /* ──────────────────────────────────────────────
     5. Three-Column Feature Grid
     Compact 3-col layout ideal for accessories & bundles
     ────────────────────────────────────────────── */
  {
    id: 'feature-grid',
    name: 'Feature Grid',
    description: 'A compact, scannable layout using a 3-column grid for key features with images. Ideal for accessories, bundles, kits, and products with many small selling points.',
    preview: {
      accent: '#8b5cf6',
      layout: ['header', 'text', 'threecol', 'features', 'specs', 'cta']
    },
    blocks: [
      { id: '_t5a', type: 'header', data: { level: 'h1', text: 'Everything You Need' } },
      { id: '_t5b', type: 'text', data: { html: '<p>A brief overview of what\'s included and why this product (or bundle) is the smart choice. Keep it benefit-focused and scannable.</p>' } },
      { id: '_t5c', type: 'divider', data: { style: 'space', height: 8 } },
      { id: '_t5d', type: 'threecol', data: {
        col1: [
          { id: '_t5d1', type: 'image', data: { src: '', alt: 'Feature 1', width: '100%' } },
          { id: '_t5d2', type: 'header', data: { level: 'h4', text: 'Feature One' } },
          { id: '_t5d3', type: 'text', data: { html: '<p>Short description of the first key feature or included item.</p>' } }
        ],
        col2: [
          { id: '_t5d4', type: 'image', data: { src: '', alt: 'Feature 2', width: '100%' } },
          { id: '_t5d5', type: 'header', data: { level: 'h4', text: 'Feature Two' } },
          { id: '_t5d6', type: 'text', data: { html: '<p>Short description of the second key feature or included item.</p>' } }
        ],
        col3: [
          { id: '_t5d7', type: 'image', data: { src: '', alt: 'Feature 3', width: '100%' } },
          { id: '_t5d8', type: 'header', data: { level: 'h4', text: 'Feature Three' } },
          { id: '_t5d9', type: 'text', data: { html: '<p>Short description of the third key feature or included item.</p>' } }
        ]
      }},
      { id: '_t5e', type: 'divider', data: { style: 'line', height: 24 } },
      { id: '_t5f', type: 'features', data: { items: [
        { title: 'Complete Kit', text: 'Everything included — no extra purchases needed' },
        { title: 'Compatible', text: 'Works with all major brands and models' },
        { title: 'Compact Storage', text: 'Comes with a carrying case for easy transport' },
        { title: 'Guaranteed Quality', text: 'Backed by our 2-year manufacturer warranty' }
      ]}},
      { id: '_t5g', type: 'specs', data: { title: 'Kit Contents', rows: [
        { label: 'Item 1', value: '' },
        { label: 'Item 2', value: '' },
        { label: 'Item 3', value: '' },
        { label: 'Total Weight', value: '' },
        { label: 'Case Dimensions', value: '' }
      ]}},
      { id: '_t5h', type: 'cta', data: { text: 'Buy Now', url: '', style: 'green' } }
    ]
  }

];
