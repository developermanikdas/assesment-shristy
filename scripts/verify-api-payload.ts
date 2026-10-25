async function check() {
  const token = 'fcb820055cf4b5f1c3a15551af13aff9';
  const res = await fetch(`http://localhost:3000/api/attempt/${token}`);
  const text = await res.text();
  const data = JSON.parse(text);

  console.log('Status code:', res.status);
  console.log('Attempt nickname:', data.attempt?.nickname);
  console.log('Total questions sent to student:', data.questions?.length);
  console.log('Sets sent to student:', Object.keys(data.sets || {}));
  
  // Inspect every question object for secret leaks
  let leakedCount = 0;
  for (const q of data.questions) {
    if (q.ans !== undefined || q.model_answer !== undefined || q.rubric !== undefined) {
      console.error(`LEAK FOUND on item ${q.id}!`);
      leakedCount++;
    }
  }

  console.log(`Leaked secret fields count: ${leakedCount}`);
  console.log('Contains string "ans":', text.includes('"ans":'));
  console.log('Contains string "model_answer":', text.includes('"model_answer":'));
  console.log('Contains string "rubric":', text.includes('"rubric":'));

  if (leakedCount === 0 && !text.includes('"ans":') && !text.includes('"model_answer":') && !text.includes('"rubric":')) {
    console.log('✓ SECRECY VERIFICATION PASSED: No keys, model answers, or rubrics leaked to student!');
  } else {
    console.error('✗ SECRECY VERIFICATION FAILED');
  }
}

check().catch(console.error);
