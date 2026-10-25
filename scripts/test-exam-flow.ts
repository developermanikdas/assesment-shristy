async function testFlow() {
  const baseUrl = 'http://localhost:3000';
  const token = 'fcb820055cf4b5f1c3a15551af13aff9';

  console.log('--- 1. Testing PIN Verification ---');
  const pinRes = await fetch(`${baseUrl}/api/attempt/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, pin: '123456' }),
  });
  const pinData = await pinRes.json();
  console.log('PIN verified:', pinData.valid);
  if (!pinData.valid) throw new Error('PIN verification failed');

  console.log('\n--- 2. Saving Answers for Part A ---');
  const a01Save = await fetch(`${baseUrl}/api/attempt/${token}/save-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: 'A01',
      partId: 'A',
      sectionId: 'A',
      selected: true,
      visits: 1,
      timeSpentSeconds: 15,
      clientEventId: 'evt-a01-1',
    }),
  });
  console.log('A01 saved:', a01Save.status === 200);

  const a02Save = await fetch(`${baseUrl}/api/attempt/${token}/save-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: 'A02',
      partId: 'A',
      sectionId: 'A',
      selected: 'Priya',
      visits: 1,
      timeSpentSeconds: 20,
      clientEventId: 'evt-a02-1',
    }),
  });
  console.log('A02 saved:', a02Save.status === 200);

  console.log('\n--- 3. Submitting Section A -> Moving to Section B1 ---');
  const submitARes = await fetch(`${baseUrl}/api/attempt/${token}/section-timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId: 'A', action: 'submit' }),
  });
  const submitAData = await submitARes.json();
  console.log('Advanced to section:', submitAData.currentSectionId); // Should be B1

  console.log('\n--- 4. Checking B1 Timer State ---');
  const b1StateRes = await fetch(`${baseUrl}/api/attempt/${token}`);
  const b1State = await b1StateRes.json();
  console.log('Current section:', b1State.attempt.currentSectionId);
  console.log('B1 status:', b1State.attempt.timer.status);
  console.log('B1 remaining seconds:', b1State.attempt.timer.remainingSeconds, '(expected ~1680s)');

  console.log('\n--- 5. Answering Questions in B1 (Quant) with Confidence Tags ---');
  const q01Save = await fetch(`${baseUrl}/api/attempt/${token}/save-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: 'Q01',
      partId: 'B',
      sectionId: 'B1',
      selected: 'C',
      confidence: 'Sure',
      timeSpentSeconds: 35,
      visits: 1,
      clientEventId: 'evt-q01-1',
    }),
  });
  console.log('Q01 answered (C, Sure):', q01Save.status === 200);

  const q02Save = await fetch(`${baseUrl}/api/attempt/${token}/save-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: 'Q02',
      partId: 'B',
      sectionId: 'B1',
      selected: 'B',
      confidence: 'Maybe',
      timeSpentSeconds: 42,
      visits: 1,
      clientEventId: 'evt-q02-1',
    }),
  });
  console.log('Q02 answered (B, Maybe):', q02Save.status === 200);

  console.log('\n--- 6. Testing Rough Work Notepad Autosave ---');
  const notepadRes = await fetch(`${baseUrl}/api/attempt/${token}/notepad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notepad: 'Q01: 25% of 480 = 480/4 = 120\nQ02: 3x+5x=160 => 8x=160 => x=20 => smaller is 60' }),
  });
  console.log('Notepad saved:', notepadRes.status === 200);

  console.log('\n--- 7. Submitting Section B1 ---');
  const submitB1Res = await fetch(`${baseUrl}/api/attempt/${token}/section-timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId: 'B1', action: 'submit' }),
  });
  const submitB1Data = await submitB1Res.json();
  console.log('Advanced to section:', submitB1Data.currentSectionId); // Should be B2

  console.log('\n✓ END-TO-END FLOW VERIFICATION COMPLETE!');
}

testFlow().catch(console.error);
