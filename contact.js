/* お問い合わせフォーム。送信先のアドレスは、ページに直接は書かず、ここで組み立てる(収集ロボット対策) */
(function () {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const msg = document.getElementById('formMsg');
  const sent = /[?&]sent=1/.test(location.search);
  function show(text, kind) { msg.textContent = text; msg.className = 'form-msg ' + kind; msg.hidden = false; }

  if (sent) {
    show('送信しました。お問い合わせありがとうございます。', 'ok');
    form.hidden = true;
    return;
  }
  if (!/^https?:$/.test(location.protocol)) {
    show('このフォームは、公開後のページ(https://〜)でのみ送信できます。', 'ng');
    form.querySelector('button[type=submit]').disabled = true;
    return;
  }
  form.action = 'https://formsubmit.co/' + form.getAttribute('data-u') + '@' + form.getAttribute('data-d');
  const next = form.querySelector('input[name=_next]');
  next.value = location.origin + location.pathname + '?sent=1';
  form.addEventListener('submit', function (ev) {
    const text = form.elements['message'].value.trim();
    if (!text) { ev.preventDefault(); show('お問い合わせ内容を入力してください。', 'ng'); return; }
    if (form.querySelector('input[name=_honey]').value) { ev.preventDefault(); return; }
    form.querySelector('button[type=submit]').disabled = true;
  });
})();
