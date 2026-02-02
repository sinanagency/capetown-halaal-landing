exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    // Log the submission (visible in Netlify function logs)
    console.log('=== NEW VENDOR APPLICATION ===');
    console.log('Business Name:', data.business_name);
    console.log('Description:', data.business_description);
    console.log('Website:', data.website);
    console.log('Instagram:', data.instagram);
    console.log('Facebook:', data.facebook);
    console.log('Contact:', data.contact_name);
    console.log('Phone:', data.phone);
    console.log('Email:', data.email);
    console.log('Notes:', data.notes);
    console.log('Submitted at:', new Date().toISOString());
    console.log('=============================');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Application received' })
    };
  } catch (error) {
    console.error('Error processing submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server error' })
    };
  }
};
