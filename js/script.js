(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Entry email popup ---------------- */
  (function () {
    var popup = document.getElementById('entryPopup');
    if (!popup) return;

    var STORAGE_KEY = 'backloadEntryPopupSeen';
    var backdrop = document.getElementById('entryPopupBackdrop');
    var closeBtn = document.getElementById('entryPopupClose');
    var dismissBtn = document.getElementById('entryPopupDismiss');
    var form = document.getElementById('entryPopupForm');
    var status = document.getElementById('entryPopupStatus');
    var emailInput = document.getElementById('entryPopupEmail');
    var lastFocused = null;

    function alreadySeen() {
      try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
    }
    function markSeen() {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    }

    function open() {
      lastFocused = document.activeElement;
      popup.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(function () { emailInput.focus(); }, 50);
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      popup.hidden = true;
      document.body.style.overflow = '';
      markSeen();
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    if (!alreadySeen()) {
      setTimeout(open, 1200);
    }

    closeBtn.addEventListener('click', close);
    dismissBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'entry-popup-status';
      status.textContent = '';

      if (form.botcheck.value) { close(); return; }

      if (!emailInput.value.trim() || !/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
        status.className = 'entry-popup-status err';
        status.textContent = 'Enter a valid email address.';
        return;
      }

      var accessKey = form.access_key.value;
      if (!accessKey || accessKey === 'REPLACE_WITH_WEB3FORMS_ACCESS_KEY') {
        status.className = 'entry-popup-status err';
        status.textContent = 'Signup isn’t fully set up yet — the site owner needs to add a Web3Forms key.';
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            status.className = 'entry-popup-status ok';
            status.textContent = 'Thanks! We’ll be in touch soon.';
            setTimeout(close, 1400);
          } else {
            throw new Error(data.message || 'Failed');
          }
        })
        .catch(function () {
          status.className = 'entry-popup-status err';
          status.textContent = 'Something went wrong. Please try again.';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Notify Me';
        });
    });
  })();

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Mobile nav ---------------- */
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var iconMenu = document.getElementById('iconMenu');
  var iconClose = document.getElementById('iconClose');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      iconMenu.style.display = isOpen ? 'none' : 'block';
      iconClose.style.display = isOpen ? 'block' : 'none';
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        iconMenu.style.display = 'block';
        iconClose.style.display = 'none';
      });
    });
  }

  /* ---------------- Photo placeholder fallback ---------------- */
  document.querySelectorAll('[data-photo] img').forEach(function (img) {
    var slot = img.closest('.photo-slot');
    if (!slot) return;
    if (img.complete && img.naturalWidth > 0) {
      slot.classList.add('loaded');
    }
    img.addEventListener('load', function () {
      if (img.naturalWidth > 0) slot.classList.add('loaded');
    });
    img.addEventListener('error', function () {
      slot.classList.remove('loaded');
    });
  });

  /* ---------------- Hero video: play on load, pause when scrolled away ----------------
     Skipped on narrow (phone) screens: the aerial shot's landscape framing crops badly
     into a tall portrait box, and the static poster (well-composed, truck centred) reads
     better there anyway — it also saves mobile data/battery. */
  var heroVideo = document.getElementById('heroVideo');
  var heroVideoAllowed = window.matchMedia('(min-width: 768px)').matches;
  if (heroVideo && !prefersReducedMotion && heroVideoAllowed) {
    var tryPlayHero = function () { heroVideo.play().catch(function () {}); };

    tryPlayHero();
    window.addEventListener('scroll', tryPlayHero, { once: true, passive: true });

    if ('IntersectionObserver' in window) {
      var heroVideoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tryPlayHero();
          } else {
            heroVideo.pause();
          }
        });
      }, { threshold: 0.05 });
      heroVideoObserver.observe(heroVideo);
    }
  }

  /* ---------------- Suburb autocomplete (Moving From / Moving To) ---------------- */
  function setupPlaceAutocomplete(input) {
    var wrap = input.closest('.place-autocomplete');
    var list = wrap.querySelector('.place-suggestions');
    var data = window.AU_SUBURBS || [];
    var active = -1;
    var items = [];

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    list.id = list.id || (input.id + 'Listbox');
    input.setAttribute('aria-controls', list.id);

    function highlight(text, query) {
      var idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return text;
      return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
    }

    function render(query) {
      var q = query.trim();
      if (!q) { close(); return; }

      var starts = [];
      var contains = [];
      for (var i = 0; i < data.length; i++) {
        var name = data[i][0];
        var lower = name.toLowerCase();
        if (lower.indexOf(q.toLowerCase()) === 0) starts.push(data[i]);
        else if (lower.indexOf(q.toLowerCase()) > -1) contains.push(data[i]);
      }
      items = starts.concat(contains).slice(0, 8);

      if (!items.length) { close(); return; }

      list.innerHTML = items.map(function (entry, i) {
        return '<li role="option" id="' + list.id + '-' + i + '" data-index="' + i + '">' +
          '<span>' + highlight(entry[0], q) + '</span><span class="state">' + entry[1] + '</span></li>';
      }).join('');
      active = -1;
      list.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
    }

    function close() {
      list.classList.remove('open');
      list.innerHTML = '';
      items = [];
      active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function select(index) {
      var entry = items[index];
      if (!entry) return;
      input.value = entry[0] + ', ' + entry[1];
      close();
    }

    function setActive(index) {
      var lis = list.querySelectorAll('li');
      lis.forEach(function (li) { li.removeAttribute('aria-selected'); });
      if (index >= 0 && lis[index]) {
        lis[index].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', lis[index].id);
        lis[index].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
      active = index;
    }

    input.addEventListener('input', function () { render(input.value); });

    input.addEventListener('keydown', function (e) {
      if (!list.classList.contains('open')) {
        if (e.key === 'ArrowDown') render(input.value);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(active + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(active - 1, 0));
      } else if (e.key === 'Enter') {
        if (active > -1) { e.preventDefault(); select(active); }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('li');
      if (!li) return;
      e.preventDefault();
      select(Number(li.dataset.index));
    });

    input.addEventListener('blur', function () {
      setTimeout(close, 120);
    });
  }

  document.querySelectorAll('.place-autocomplete input').forEach(setupPlaceAutocomplete);

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var answer = item.querySelector('.faq-a');
    var inner = item.querySelector('.faq-a-inner');

    btn.addEventListener('click', function () {
      var isOpen = item.getAttribute('data-open') === 'true';

      document.querySelectorAll('.faq-item').forEach(function (other) {
        if (other !== item) {
          other.setAttribute('data-open', 'false');
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });

      var nextState = !isOpen;
      item.setAttribute('data-open', String(nextState));
      btn.setAttribute('aria-expanded', String(nextState));
      answer.style.maxHeight = nextState ? inner.offsetHeight + 'px' : null;
    });
  });

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Guarantee gauge animation ---------------- */
  var gaugeSection = document.getElementById('guarantee');
  var gaugeFill = document.getElementById('gaugeFill');
  var gaugeFinal = document.getElementById('gaugeFinal');
  var MAX_PRICE = 2400;
  var FINAL_PRICE = 1850;

  function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }

  function animateGauge() {
    if (!gaugeFill || !gaugeFinal) return;
    if (prefersReducedMotion) {
      gaugeFill.style.transform = 'scaleX(' + (FINAL_PRICE / MAX_PRICE) + ')';
      gaugeFinal.textContent = formatMoney(FINAL_PRICE);
      gaugeFinal.style.color = '#FFFFFF';
      return;
    }
    var start = null;
    var duration = 1400;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var currentPrice = MAX_PRICE - (MAX_PRICE - FINAL_PRICE) * eased;
      gaugeFill.style.transform = 'scaleX(' + (currentPrice / MAX_PRICE) + ')';
      gaugeFinal.textContent = formatMoney(currentPrice);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        gaugeFinal.style.color = '#FFFFFF';
      }
    }
    requestAnimationFrame(step);
  }

  if (gaugeSection) {
    if ('IntersectionObserver' in window) {
      var gaugeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateGauge();
            gaugeObserver.disconnect();
          }
        });
      }, { threshold: 0.4 });
      gaugeObserver.observe(gaugeSection);
    } else {
      animateGauge();
    }
  }

  /* ---------------- Quote form ---------------- */
  var form = document.getElementById('quoteForm');
  var statusBox = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');

  var requiredFields = ['fullName', 'phone', 'email', 'moveFrom', 'moveTo'];

  function showFieldError(name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    var field = input.closest('.field');
    var errorEl = field.querySelector('.field-error');
    field.classList.toggle('invalid', Boolean(message));
    if (errorEl) errorEl.textContent = message || '';
  }

  function validateForm() {
    var valid = true;

    requiredFields.forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input.value.trim()) {
        showFieldError(name, 'This field is required.');
        valid = false;
      } else {
        showFieldError(name, '');
      }
    });

    var emailInput = form.querySelector('[name="email"]');
    if (emailInput.value.trim() && !/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
      showFieldError('email', 'Enter a valid email address.');
      valid = false;
    }

    var phoneInput = form.querySelector('[name="phone"]');
    if (phoneInput.value.trim() && phoneInput.value.replace(/[^0-9]/g, '').length < 8) {
      showFieldError('phone', 'Enter a valid phone number.');
      valid = false;
    }

    return valid;
  }

  if (form) {
    form.querySelectorAll('input, select, textarea').forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field && field.classList.contains('invalid')) {
          showFieldError(input.name, '');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusBox.className = 'form-status';
      statusBox.textContent = '';

      if (form.botcheck.value) return; // honeypot triggered, silently drop

      if (!validateForm()) {
        statusBox.className = 'form-status err show';
        statusBox.textContent = 'Please fix the highlighted fields and try again.';
        return;
      }

      var accessKey = form.access_key.value;
      if (!accessKey || accessKey === 'REPLACE_WITH_WEB3FORMS_ACCESS_KEY') {
        statusBox.className = 'form-status err show';
        statusBox.textContent = 'Quote form is not fully set up yet — the site owner needs to add a Web3Forms access key. Please call 03 6361 8890 or email Backloadremovalist@gmail.com instead.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var formData = new FormData(form);

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            statusBox.className = 'form-status ok show';
            statusBox.textContent = "Thanks! We've got your details and will be in touch within one business day with your maximum price.";
            form.reset();
          } else {
            throw new Error(data.message || 'Submission failed');
          }
        })
        .catch(function () {
          statusBox.className = 'form-status err show';
          statusBox.textContent = "Something went wrong sending your request. Please call 03 6361 8890 or email Backloadremovalist@gmail.com and we'll help directly.";
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get My Free Quote';
        });
    });
  }
})();
