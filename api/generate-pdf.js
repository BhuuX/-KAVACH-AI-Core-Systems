import catalyst from 'zcatalyst-sdk-node';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html, filename = 'document.pdf' } = req.body;
  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  try {
    const catalystApp = catalyst.initialize();
    const smartbrowz = catalystApp.smartbrowz();
    
    console.log('[KAVACH SMARTBROWZ] Converting HTML to PDF...');
    
    // Call Catalyst SmartBrowz to compile HTML to PDF binary
    const pdfStream = await smartbrowz.convertToPdf(html, {
      pdf_options: {
        display_header_footer: true,
        margin: { bottom: '40', left: '30', right: '30', top: '40' },
        landscape: false
      },
      page_options: {
        javascript_enabled: true
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the binary stream back
    res.end(pdfStream);
  } catch (err) {
    console.error('[KAVACH SMARTBROWZ] Error generating PDF:', err);
    return res.status(500).json({ error: err.message });
  }
}
