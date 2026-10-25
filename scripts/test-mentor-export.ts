async function testMentor() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. Testing Mentor Login ---');
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || '',
      password: process.env.ADMIN_PASSWORD || '',
    }),
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);
  console.log('Session cookie received:', !!cookieHeader);

  if (!cookieHeader) throw new Error('No cookie received from login');

  // Extract admin_session cookie
  const cookieMatch = cookieHeader.match(/admin_session=([^;]+)/);
  const sessionCookie = cookieMatch ? `admin_session=${cookieMatch[1]}` : '';

  console.log('\n--- 2. Fetching Candidate List ---');
  const attemptsRes = await fetch(`${baseUrl}/api/admin/attempts`, {
    headers: { Cookie: sessionCookie },
  });
  const attemptsData = await attemptsRes.json();
  console.log('Total attempts found:', attemptsData.attempts?.length);
  const priya = attemptsData.attempts.find((a: any) => a.nickname === 'Priya Sharma');
  console.log('Found candidate Priya Sharma ID:', priya?.id);

  if (!priya) throw new Error('Candidate not found');

  console.log('\n--- 3. Fetching Candidate Dossier & Analytics ---');
  const dossierRes = await fetch(`${baseUrl}/api/admin/attempts/${priya.id}`, {
    headers: { Cookie: sessionCookie },
  });
  const dossier = await dossierRes.json();
  console.log('Candidate nickname:', dossier.attempt.nickname);
  console.log('Current section:', dossier.attempt.currentSectionId);
  console.log('MCQ analytics B1 correct:', dossier.mcqAnalytics.sectionScores.B1.correct);
  console.log('MCQ analytics B1 wrong:', dossier.mcqAnalytics.sectionScores.B1.wrong);
  console.log('MCQ analytics B1 net score:', dossier.mcqAnalytics.sectionScores.B1.netScore);
  console.log('Topic breakdown count:', dossier.mcqAnalytics.topicBreakdown.length);
  console.log('Confidence matrix Sure count:', dossier.mcqAnalytics.confidenceMatrix.Sure.total);

  console.log('\n--- 4. Testing JSON Bundle Export ---');
  const jsonExportRes = await fetch(`${baseUrl}/api/admin/attempts/${priya.id}/export?format=json`, {
    headers: { Cookie: sessionCookie },
  });
  const disposition = jsonExportRes.headers.get('content-disposition');
  console.log('JSON export status:', jsonExportRes.status);
  console.log('JSON export header:', disposition);

  const bundle = await jsonExportRes.json();
  console.log('Export meta student:', bundle.meta.studentNickname);
  console.log('Export per-question rows count:', bundle.perQuestionRows.length);

  console.log('\n--- 5. Testing Flat CSV Export ---');
  const csvExportRes = await fetch(`${baseUrl}/api/admin/attempts/${priya.id}/export?format=csv`, {
    headers: { Cookie: sessionCookie },
  });
  const csvDisposition = csvExportRes.headers.get('content-disposition');
  const csvText = await csvExportRes.text();
  console.log('CSV export status:', csvExportRes.status);
  console.log('CSV header:', csvDisposition);
  console.log('CSV first line:', csvText.split('\n')[0]);
  console.log('CSV second line:', csvText.split('\n')[1]);

  console.log('\n✓ MENTOR PORTAL & EXPORT VERIFICATION COMPLETE!');
}

testMentor().catch(console.error);
