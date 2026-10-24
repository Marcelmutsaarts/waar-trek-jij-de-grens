/* Waar trek jij de grens?
   Een socratische app zonder chatbot. Sam heeft geen mening en wil begrijpen waar de
   student de grens legt. De app interpreteert geen vrije tekst. Hij werkt met:
   1. situaties die vooraf zijn gecodeerd op een paar kenmerken;
   2. een consistentiecheck: past de regel van de student bij zijn eigen eerdere keuzes?
   3. de eigen woorden van de student, die letterlijk worden teruggegeven.
   De webinarlaag is alleen zichtbaar via ?webinar in de URL of de toets W. */

(() => {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Kenmerken ---------- */
  // mild = de waarde die een situatie "makkelijker toelaatbaar" maakt.

  const DIMS = {
    zicht: { naam: 'Openbaar of besloten', mild: 'O', w: {
      O: { bij: 'openbaar is', hoofd: 'Het is openbaar', beide: 'Ze zijn allebei openbaar.' },
      B: { bij: 'besloten is', hoofd: 'Het is besloten', beide: 'Ze zijn allebei besloten.' } } },
    onderwerp: { naam: 'Over werk of over je privéleven', mild: 'W', w: {
      W: { bij: 'over je werk of opleiding gaat', hoofd: 'Het gaat over je werk of opleiding', beide: 'Ze gaan allebei over je werk of opleiding.' },
      P: { bij: 'over je privéleven gaat', hoofd: 'Het gaat over je privéleven', beide: 'Ze gaan allebei over je privéleven.' } } },
    tijd: { naam: 'Recent of lang geleden', mild: 'N', w: {
      N: { bij: 'recent is', hoofd: 'Het is recent', beide: 'Ze zijn allebei recent.' },
      D: { bij: 'van lang geleden is', hoofd: 'Het is van lang geleden', beide: 'Ze zijn allebei van lang geleden.' } } },
    gevoelig: { naam: 'Gewoon of gevoelig (gezondheid, geloof, politiek)', mild: 'G', w: {
      G: { bij: 'niet over gezondheid, geloof of politiek gaat', hoofd: 'Het gaat niet over gezondheid, geloof of politiek', beide: 'Ze gaan allebei niet over gezondheid, geloof of politiek.' },
      S: { bij: 'over gezondheid, geloof of politiek gaat', hoofd: 'Het gaat over gezondheid, geloof of politiek', beide: 'Ze gaan allebei over gezondheid, geloof of politiek.' } } },
    relevant: { naam: 'Zegt het iets over hoe je het werk doet?', mild: 'J', w: {
      J: { bij: 'iets zegt over hoe je dit werk gaat doen', hoofd: 'Het zegt iets over hoe je dit werk gaat doen', beide: 'Ze zeggen allebei iets over hoe je het werk doet.' },
      N: { bij: 'niets zegt over hoe je dit werk gaat doen', hoofd: 'Het zegt niets over hoe je dit werk gaat doen', beide: 'Ze zeggen allebei niets over hoe je het werk doet.' } } },
    manier: { naam: 'Open of stiekem', mild: 'E', w: {
      E: { bij: 'open en eerlijk gebeurt', hoofd: 'De werkgever doet het open en eerlijk', beide: 'Bij allebei doet de werkgever het open en eerlijk.' },
      X: { bij: 'stiekem gebeurt', hoofd: 'De werkgever doet het stiekem', beide: 'Bij allebei doet de werkgever het stiekem.' } } }
  };
  const VERSCHIL_DIMS = ['zicht', 'onderwerp', 'tijd', 'gevoelig', 'relevant'];
  const andere = (d, v) => Object.keys(DIMS[d].w).find(k => k !== v);

  /* ---------- Situaties ---------- */
  // De ladder is cumulatief: elke volgende kaart verschuift één of twee kenmerken
  // naar de minder toelaatbare kant. Zo weet de app precies wat het verschil is
  // tussen twee buurkaarten, waar de student zijn streep ook zet.

  const C = (id, icon, tekst, zicht, onderwerp, tijd, gevoelig, relevant, manier, verwacht) =>
    ({ id, icon, tekst, zicht, onderwerp, tijd, gevoelig, relevant, manier, verwacht });

  const LADDER = [
    C('R1', 'werk', 'Je LinkedIn-profiel, met je opleiding en stages.', 'O', 'W', 'N', 'G', 'J', 'E'),
    C('R2', 'foto', 'Je openbare Instagram, met foto\'s van feestjes en weekendjes weg van de afgelopen maanden.', 'O', 'P', 'N', 'G', 'N', 'E'),
    C('R3', 'klok', 'Feestfoto\'s van vijf jaar geleden op je openbare Instagram. De werkgever scrolt ver terug.', 'O', 'P', 'D', 'G', 'N', 'E'),
    C('R4', 'slot', 'Dezelfde oude feestfoto\'s, maar dan op je besloten Instagram. De werkgever stuurt een volgverzoek om ze te kunnen zien.', 'B', 'P', 'D', 'G', 'N', 'E'),
    C('R5', 'hart', 'Een oude post over je gezondheid, ook op je besloten Instagram.', 'B', 'P', 'D', 'S', 'N', 'E')
  ];

  // Testsituaties: tegenvoorbeelden. "verwacht" is wat de meeste mensen vinden;
  // de app gebruikt dat alleen om een situatie te kiezen die de regel op de proef stelt.
  const TESTS = [
    C('T1', 'video', 'Je solliciteert bij een kinderopvang. Op je openbare TikTok staan filmpjes waarin je kinderen belachelijk maakt.', 'O', 'P', 'N', 'G', 'J', 'E', true),
    C('T2', 'megafoon', 'Op je openbare Instagram deel je berichten van een politieke partij.', 'O', 'P', 'N', 'S', 'N', 'E', false),
    C('T3', 'schild', 'Je solliciteert bij een beveiligingsbedrijf. In een besloten groep met 400 leden deel je filmpjes van vechtpartijen waar je zelf aan meedoet.', 'B', 'P', 'N', 'G', 'J', 'E', true),
    C('T4', 'zorg', 'Je solliciteert in de zorg. Drie jaar geleden, tijdens je eerste stage, zette je een foto van een cliënt openbaar online.', 'O', 'W', 'D', 'G', 'J', 'E', true),
    C('T5', 'hart', 'Op je LinkedIn vertel je dat je een half jaar thuis zat met een burn-out.', 'O', 'W', 'N', 'S', 'N', 'E', false),
    C('T6', 'masker', 'De werkgever maakt een nepaccount om je besloten Instagram te kunnen volgen.', 'B', 'P', 'N', 'G', 'N', 'X', false)
  ];

  const CASES = {};
  LADDER.concat(TESTS).forEach(c => { CASES[c.id] = c; });
  const MAX_TESTS = 3;

  const ICONS = {
    werk: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    foto: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    klok: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    slot: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    hart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
    megafoon: '<path d="M3 10v4h4l7 4V6L7 10H3z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    schild: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    zorg: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM12 11v6M9 14h6"/>',
    masker: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6M3 3l18 18"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  /* ---------- Regels ---------- */

  const freshRule = () => ({ base: null, c0: null, or: [], req: [], notes: [], own: null });
  const clone = r => JSON.parse(JSON.stringify(r));

  function predict(rule, c) {
    if (rule.own !== null) return null;
    const baseOk = rule.base === 'all' ? true : rule.base === 'none' ? false : c[rule.c0.d] === rule.c0.v;
    const orOk = rule.or.some(x => c[x.d] === x.v);
    const reqOk = rule.req.every(x => c[x.d] === x.v);
    return (baseOk || orOk) && reqOk;
  }

  function ruleParts(rule) {
    if (rule.own !== null) return { main: rule.own, notes: [] };
    const bij = x => DIMS[x.d].w[x.v].bij;
    let s;
    if (rule.base === 'all') s = 'Een werkgever mag alles bekijken';
    else if (rule.base === 'none') s = 'Een werkgever mag niets bekijken';
    else s = `Een werkgever mag het bekijken als het ${bij(rule.c0)}`;
    if (rule.or.length) {
      const ors = rule.or.map(bij).join(', of als het ');
      s += rule.base === 'none' ? `, behalve als het ${ors}` : `, of als het ${ors}`;
    }
    s += '.';
    if (rule.req.length) s += ` Maar alleen als het ${rule.req.map(bij).join(' en als het ')}.`;
    return { main: s, notes: rule.notes.slice() };
  }
  const ruleString = r => { const p = ruleParts(r); return [p.main].concat(p.notes.map(n => `Aanvulling: ${n}`)).join(' '); };

  /* ---------- Toestand ---------- */

  const fresh = () => ({
    screen: 'intro',
    line: null,
    v: {},              // stap "het verschil"
    rule: freshRule(),
    woorden: '',
    versions: [],
    judgments: [],      // oordelen over testsituaties
    shown: [],
    test: null,
    fields: { woorden: '', aanvulling: '', eigen: '', eind: '' },
    gekopieerd: false
  });
  let state = fresh();
  let lastView = '';
  const webinar = { armed: false, open: false };

  function ladderJudgments() {
    return LADDER.map((c, i) => ({ c, verdict: i < state.line }));
  }
  function allJudgments() {
    return ladderJudgments().concat(state.judgments.filter(j => !j.exempt).map(j => ({ c: CASES[j.id], verdict: j.verdict })));
  }
  function findConflict(rule) {
    return allJudgments().find(j => predict(rule, j.c) !== j.verdict) || null;
  }

  function nextTest() {
    if (state.shown.length >= MAX_TESTS) return null;
    const open = TESTS.filter(t => !state.shown.includes(t.id));
    if (state.rule.own !== null) return open[0] || null;
    const lastig = open.find(t => predict(state.rule, t) !== t.verwacht);
    if (lastig) return lastig;
    return state.shown.length === 0 ? (open[0] || null) : null;
  }

  function startTest() {
    const t = nextTest();
    if (!t) { state.screen = 'eind'; state.test = null; return; }
    state.shown.push(t.id);
    state.test = { id: t.id, phase: 'oordeel', verdict: null, pred: null, regelOordeel: null, last: null, catch: null, anders: false, nieuw: '' };
    state.fields.aanvulling = '';
    state.fields.eigen = state.rule.own || '';
  }

  /* ---------- Bouwstenen ---------- */

  const sam = html => `<div class="turn turn-sam"><span class="avatar" aria-hidden="true">S</span><div class="bubble">${html}</div></div>`;
  const jij = text => `<div class="turn turn-jij"><span class="sr">Jij: </span><div class="bubble">${esc(text)}</div></div>`;
  const magTekst = b => b ? 'Mag' : 'Mag niet';

  function card(c, extra = '') {
    return `<article class="card ${extra}">
      <span class="card-icon">${icon(c.icon)}</span>
      <p>${esc(c.tekst)}</p>
    </article>`;
  }

  function ruleCard(compact) {
    const p = ruleParts(state.rule);
    return `<section class="rule ${compact ? 'rule-compact' : ''}" aria-label="Jouw regel">
      <p class="rule-kop">Jouw regel</p>
      <p class="rule-tekst">${esc(p.main)}</p>
      ${p.notes.map(n => `<p class="rule-note">Aanvulling: ${esc(n)}</p>`).join('')}
      ${state.woorden && state.rule.own === null ? `<p class="rule-woorden">In je eigen woorden: “${esc(state.woorden)}”</p>` : ''}
    </section>`;
  }

  function steps() {
    const order = ['grens', 'verschil', 'test', 'eind'];
    const names = ['Je grens', 'Het verschil', 'Testen', 'Jouw regel'];
    const nu = order.indexOf(state.screen);
    if (nu < 0) return '';
    return names.map((n, i) => `<li class="${i < nu ? 'is-done' : ''} ${i === nu ? 'is-now' : ''}" ${i === nu ? 'aria-current="step"' : ''}><span class="step-n">${i + 1}</span><span class="step-t">${n}</span></li>`).join('');
  }

  /* ---------- Schermen ---------- */

  function viewIntro() {
    return `<section class="screen intro">
      <h1 tabindex="-1">Waar trek jij de grens?</h1>
      <div class="tape tape-hero" aria-hidden="true"></div>
      ${sam(`<p>Hoi, ik ben Sam. Stel: je solliciteert op een stage of een baan, en de werkgever zoekt je online op.</p>
        <p>Wat mag hij van jou bekijken? Ik weet het zelf nog niet. Ik wil snappen waar jij de grens legt.</p>`)}
      <p class="hint">Er is geen goed of fout. Het gaat om jouw redenering.</p>
      <div class="actions"><button type="button" class="btn" data-action="start">Begin</button></div>
    </section>`;
  }

  function viewGrens() {
    const L = state.line;
    let html = '';
    for (let i = 0; i <= LADDER.length; i++) {
      const gezet = L === i;
      const plek = i === 0 ? 'boven alles' : i === LADDER.length ? 'onder alles' : `tussen situatie ${i} en ${i + 1}`;
      html += `<div class="gap ${gezet ? 'is-set' : ''}">
        <button type="button" data-action="streep" data-i="${i}" aria-pressed="${gezet}" aria-label="Zet de streep ${plek}">
          <span class="gap-line" aria-hidden="true"></span>
          <span class="gap-label">${gezet ? 'Jouw grens' : 'Zet de streep hier'}</span>
        </button>
      </div>`;
      if (i < LADDER.length) {
        const status = L === null ? '' : (i < L ? 'is-mag' : 'is-niet');
        const label = L === null ? '' : `<span class="pill">${i < L ? 'Mag' : 'Mag niet'}</span>`;
        html += `<article class="card ladder-card ${status}">
          <span class="card-icon">${icon(LADDER[i].icon)}</span>
          <p>${esc(LADDER[i].tekst)}</p>${label}
        </article>`;
      }
    }
    return `<section class="screen grens">
      <h1 tabindex="-1">Wat mag de werkgever bekijken?</h1>
      ${sam('<p>Zet de streep. Wat erboven staat mag de werkgever bekijken, wat eronder staat niet.</p>')}
      <div class="ladder">${html}</div>
      <div class="actions"><button type="button" class="btn" data-action="grens-klaar" ${L === null ? 'disabled' : ''}>Dit is mijn grens</button></div>
    </section>`;
  }

  function veld(name, label, ph, rows = 3) {
    return `<label class="field"><span class="sr">${esc(label)}</span>
      <textarea data-field="${name}" rows="${rows}" placeholder="${esc(ph)}">${esc(state.fields[name])}</textarea></label>`;
  }

  function viewVerschil() {
    const L = state.line;
    const v = state.v;
    const extreem = L === 0 || L === LADDER.length;
    let body = '';

    if (extreem) {
      body += L === 0
        ? sam('<p>Je vindt dat een werkgever niets mag bekijken, ook je LinkedIn-profiel niet. Waarom?</p>')
        : sam('<p>Je vindt dat een werkgever alles mag bekijken, ook een oude post over je gezondheid op je besloten account. Waarom?</p>');
      body += veld('woorden', 'Jouw uitleg', 'Omdat ...');
      body += v.hint ? `<p class="hint hint-warn">${esc(v.hint)}</p>` : '';
      body += `<div class="actions"><button type="button" class="btn" data-action="woorden-klaar">Verder</button></div>`;
      return `<section class="screen verschil"><h1 tabindex="-1">Waarom daar?</h1>${body}</section>`;
    }

    const up = LADDER[L - 1], low = LADDER[L];
    body += `<div class="pair">
      <div class="pair-col"><p class="pair-kop pair-mag">Mag wel</p>${card(up, 'is-mag')}</div>
      <div class="pair-col"><p class="pair-kop pair-niet">Mag niet</p>${card(low, 'is-niet')}</div>
    </div>`;
    body += sam('<p>Hier ligt jouw grens. Wat is het verschil tussen deze twee?</p>');

    const opties = (tried) => `<div class="options">${VERSCHIL_DIMS.map(d =>
      `<button type="button" class="option" data-action="verschil" data-d="${d}" ${tried.includes(d) ? 'disabled' : ''}>${esc(DIMS[d].naam)}</button>`).join('')}
      <button type="button" class="option option-anders" data-action="verschil" data-d="anders">Iets anders</button></div>`;

    if (!v.choice) {
      if (v.last) {
        body += jij(DIMS[v.last].naam);
        body += sam(`<p>${esc(v.catch)}</p>`);
      }
      body += opties(v.tried || []);
    } else if (v.choice === 'anders') {
      body += jij('Iets anders');
      body += sam('<p>Vertel: wat is voor jou het verschil?</p>');
      body += veld('woorden', 'Jouw uitleg', 'Het verschil is ...');
      body += v.hint ? `<p class="hint hint-warn">${esc(v.hint)}</p>` : '';
      body += `<div class="actions"><button type="button" class="btn" data-action="woorden-klaar">Verder</button></div>`;
    } else {
      body += jij(DIMS[v.choice].naam);
      body += sam('<p>Klopt, daarin verschillen ze. Zeg het nu in je eigen woorden: waarom mag het ene wel en het andere niet?</p>');
      body += veld('woorden', 'Jouw uitleg', 'Het ene mag wel, omdat ...');
      body += v.hint ? `<p class="hint hint-warn">${esc(v.hint)}</p>` : '';
      body += `<div class="actions"><button type="button" class="btn" data-action="woorden-klaar">Verder</button></div>`;
    }
    return `<section class="screen verschil"><h1 tabindex="-1">Wat is het verschil?</h1>${body}</section>`;
  }

  function verfijnOpties(t, pred, tried = []) {
    // Regel zegt "mag", student "mag niet": zoek wat het NIET oké maakt (niet-milde kenmerken).
    // Regel zegt "mag niet", student "mag": zoek wat het WEL oké maakt (milde kenmerken).
    const dims = Object.keys(DIMS).filter(d => pred ? t[d] !== DIMS[d].mild : t[d] === DIMS[d].mild);
    return `<div class="options">${dims.map(d =>
      `<button type="button" class="option" data-action="verfijn" data-d="${d}" ${tried.includes(d) ? 'disabled' : ''}>${esc(DIMS[d].w[t[d]].hoofd)}</button>`).join('')}
      <button type="button" class="option option-anders" data-action="verfijn" data-d="anders">Iets anders</button></div>`;
  }

  function verderKnop() {
    const volgende = nextTest();
    return `<div class="actions"><button type="button" class="btn" data-action="volgende">${volgende ? 'Volgende situatie' : 'Bekijk jouw regel'}</button></div>`;
  }

  function viewTest() {
    const T = state.test;
    const t = CASES[T.id];
    const nr = state.shown.length;
    let d = '';

    d += sam(`<p>${nr === 1 ? 'Ik ga je regel testen met een nieuwe situatie. ' : ''}Mag de werkgever dit bekijken?</p>`);

    if (T.phase === 'oordeel') {
      d += `<div class="choice">
        <button type="button" class="btn btn-ja" data-action="oordeel" data-v="1">Mag</button>
        <button type="button" class="btn btn-nee" data-action="oordeel" data-v="0">Mag niet</button></div>`;
    } else {
      d += jij(magTekst(T.verdict));
    }

    // Eigen regel (vrije tekst): de student past zijn regel zelf toe.
    if (state.rule.own !== null && T.phase !== 'oordeel') {
      const regel = T.regelOud || state.rule.own;
      d += sam(`<p>Jouw regel is: “${esc(regel)}”. Mag dit volgens jouw regel?</p>`);
      if (T.phase === 'eigenregel') {
        d += `<div class="choice">
          <button type="button" class="btn btn-ja" data-action="eigen-oordeel" data-v="1">Mag</button>
          <button type="button" class="btn btn-nee" data-action="eigen-oordeel" data-v="0">Mag niet</button></div>`;
      } else {
        d += jij(magTekst(T.regelOordeel));
        if (T.phase === 'houdt') {
          d += sam('<p>Je regel en je oordeel zeggen hetzelfde. Je regel houdt stand.</p>') + verderKnop();
        } else if (T.phase === 'aanpassen') {
          d += sam('<p>Je regel en je oordeel botsen. Pas je regel aan, zodat hij ook hier klopt.</p>');
          d += veld('eigen', 'Jouw aangepaste regel', 'Een werkgever mag ...');
          d += `<div class="actions"><button type="button" class="btn" data-action="eigen-opslaan">Pas mijn regel aan</button></div>`;
        } else if (T.phase === 'aangepast') {
          d += sam(`<p>Helder. Je regel is nu: <strong>${esc(state.rule.own)}</strong></p>`) + verderKnop();
        }
      }
      return testScreen(t, nr, d);
    }

    if (T.phase === 'houdt') {
      d += sam(`<p>Volgens je regel mag dit ${T.pred ? 'wel' : 'niet'}, en dat vind jij ook. Je regel houdt stand.</p>`) + verderKnop();
    }

    if (T.phase === 'botst' || T.phase === 'aangepast') {
      d += sam(`<p>Volgens je regel mag dit ${T.pred ? 'wel' : 'niet'}. Maar jij vindt van ${T.verdict ? 'wel' : 'niet'}. Wat maakt deze situatie anders?</p>`);
    }

    if (T.phase === 'aangepast') {
      d += T.last === 'anders' ? jij(state.rule.notes[state.rule.notes.length - 1]) : jij(DIMS[T.last].w[t[T.last]].hoofd);
      d += sam(`<p>Helder. Dan wordt je regel:</p><p class="quote">${esc(ruleString(state.rule))}</p>`) + verderKnop();
    }

    if (T.phase === 'botst') {
      if (T.anders) {
        d += jij('Iets anders');
        d += sam('<p>Vertel: wat maakt deze situatie anders?</p>');
        d += veld('aanvulling', 'Wat maakt het anders', 'Hier is het anders, omdat ...', 2);
        d += T.hint ? `<p class="hint hint-warn">${esc(T.hint)}</p>` : '';
        d += `<div class="actions"><button type="button" class="btn" data-action="aanvulling-klaar">Voeg toe aan mijn regel</button></div>`;
      } else {
        if (T.catch) {
          d += jij(DIMS[T.last].w[t[T.last]].hoofd);
          const cc = CASES[T.catch.id];
          if (T.catch.id === t.id) {
            d += sam(`<p>Maar dan mag dit volgens je regel nog steeds ${T.catch.pred ? 'wel' : 'niet'}. Kies iets anders.</p>`);
          } else {
            d += sam(`<p>Maar volgens die regel mag dit ${T.catch.pred ? 'wel' : 'niet'}:</p>${card(cc, 'card-mini ' + (T.catch.verdict ? 'is-mag' : 'is-niet'))}
              <p>Dat vond jij juist ${T.catch.verdict ? 'wel' : 'niet'} oké. Wat maakt deze situatie dan anders?</p>`);
          }
        }
        d += verfijnOpties(t, T.pred, T.tried || []);
        if (T.catch) d += `<p class="hint">Kom je er niet uit? <button type="button" class="link" data-action="verplaats">Zet je streep opnieuw</button></p>`;
      }
    }

    return testScreen(t, nr, d);
  }

  function testScreen(t, nr, dialoog) {
    return `<section class="screen test">
      ${ruleCard(true)}
      <h1 tabindex="-1" class="h-test">Situatie ${nr}</h1>
      ${card(t, 'card-test')}
      <div class="dialog" aria-live="polite">${dialoog}</div>
    </section>`;
  }

  function viewEind() {
    const p = ruleParts(state.rule);
    const veranderd = state.versions.length > 1;
    return `<section class="screen eind">
      <h1 tabindex="-1">Jouw regel</h1>
      <div class="tape" aria-hidden="true"></div>
      <section class="rule rule-eind">
        <p class="rule-tekst">${esc(p.main)}</p>
        ${p.notes.map(n => `<p class="rule-note">Aanvulling: ${esc(n)}</p>`).join('')}
      </section>
      ${state.woorden && state.rule.own === null ? `<p class="hint">Aan het begin zei je: “${esc(state.woorden)}”</p>` : ''}

      <h2>${veranderd ? 'Zo werd je regel scherper' : 'Je regel hield stand'}</h2>
      ${veranderd
        ? `<ol class="versies">${state.versions.map((v, i) => `<li><span class="versie-n">Versie ${i + 1}</span><span>${esc(v)}</span></li>`).join('')}</ol>`
        : '<p class="sub">Elke situatie die ik bedacht, paste bij je regel.</p>'}

      ${sam('<p>Schrijf je regel nu op zoals jij hem in de les zou verdedigen.</p>')}
      ${veld('eind', 'Jouw regel in je eigen woorden', 'Een werkgever mag ...', 4)}
      <div class="actions">
        <button type="button" class="btn" data-action="kopieer">Kopieer mijn regel</button>
        <span class="copied" aria-live="polite">${state.gekopieerd ? 'Gekopieerd' : ''}</span>
      </div>

      <details class="regels">
        <summary>Vergelijk met de regels</summary>
        <p>De Autoriteit Persoonsgegevens en andere Europese privacytoezichthouders zeggen:</p>
        <ul>
          <li>Een werkgever mag alleen kijken als het nodig en relevant is voor de functie.</li>
          <li>Hij moet het vooraf vertellen, bijvoorbeeld in de vacature.</li>
          <li>Informatie over je gezondheid hoort er niet bij.</li>
          <li>Een volgverzoek accepteren telt niet als echte toestemming. Je wilt de baan, dus je kunt niet vrij nee zeggen.</li>
          <li>Wat online staat, kan oud of uit zijn verband zijn. Vraag de sollicitant er liever naar.</li>
        </ul>
        ${sam('<p>Waar lijkt jouw regel op deze regels, en waar wijkt hij af?</p>')}
      </details>

      <div class="actions"><button type="button" class="link" data-action="opnieuw">Opnieuw beginnen</button></div>
    </section>`;
  }

  /* ---------- Webinarlaag ---------- */

  const W = {
    rol: { titel: 'Sam speelt de lerende', tekst: 'Sam heeft geen mening en wil begrijpen hoe de student denkt. Daardoor ligt het denkwerk bij de student.' },
    vastleggen: { titel: 'Eerst zelf positie kiezen', tekst: 'Een eigen idee moet op tafel liggen voordat het kan veranderen. De student zet de streep voordat er iets wordt gevraagd of uitgelegd.' },
    verhelder: { titel: 'Verhelder begrippen en aannames', tekst: 'Twee buursituaties verschillen in één of twee kenmerken. Noemt de student een verschil dat er niet is, dan kaatst Sam dat terug.' },
    redenen: { titel: 'Onderzoek redenen', tekst: 'De student zegt in eigen woorden waarom. De app interpreteert die zin niet, maar laat hem steeds terugkomen.' },
    toets: { titel: 'Toets en scherp de conclusie aan', tekst: 'Sam kiest situaties waarin de regel van de student en de gangbare intuïtie waarschijnlijk botsen. Botst het, dan scherpt de student zijn regel aan.' },
    consistent: { titel: 'Consistentie, geen goed antwoord', tekst: 'Sam oordeelt niet over de mening. Hij checkt alleen of de regel past bij wat de student eerder zelf vond. Zo werkte Socrates ook: hij liet zien dat zijn gesprekspartner zichzelf tegensprak.' },
    zichtbaar: { titel: 'Leren wordt zichtbaar', tekst: 'Alle versies van de regel staan onder elkaar. Pas aan het eind komt de vergelijking met de echte regels.' }
  };

  function webinarKeys() {
    if (state.screen === 'intro') return { kop: 'Start', keys: ['rol'] };
    if (state.screen === 'grens') return { kop: 'De streep zetten', keys: ['vastleggen'] };
    if (state.screen === 'verschil') return { kop: 'Het verschil benoemen', keys: ['verhelder', 'redenen'] };
    if (state.screen === 'test') return { kop: 'De regel testen', keys: ['toets', 'consistent'] };
    return { kop: 'De regel', keys: ['zichtbaar'] };
  }

  function renderWebinar() {
    const panel = document.getElementById('webinar');
    const toggle = document.getElementById('webinar-toggle');
    toggle.hidden = !webinar.armed;
    toggle.setAttribute('aria-expanded', String(webinar.open));
    toggle.textContent = webinar.open ? 'Webinarlaag sluiten' : 'Webinarlaag';
    panel.hidden = !webinar.open;
    document.body.classList.toggle('webinar-open', webinar.open);
    if (!webinar.open) return;
    const ctx = webinarKeys();
    panel.innerHTML = `
      <header class="w-head">
        <p class="w-kicker">Webinarlaag</p>
        <p class="w-note">Voor het webinar, niet voor studenten. Studenten zien deze laag niet.</p>
      </header>
      <div class="w-body">
        <h3>Nu in beeld</h3>
        <p class="w-ctx">${esc(ctx.kop)}</p>
        ${ctx.keys.map(k => `<article class="w-card"><h4>${esc(W[k].titel)}</h4><p>${esc(W[k].tekst)}</p></article>`).join('')}

        <h3>Zo werkt dit zonder chatbot</h3>
        <ol class="w-list">
          <li>Elke situatie is vooraf gecodeerd op een paar kenmerken: openbaar of besloten, werk of privé, recent of oud, gevoelig of niet, relevant voor het werk of niet.</li>
          <li>De app checkt consistentie: past de regel bij de eigen eerdere keuzes van de student?</li>
          <li>De eigen woorden van de student komen letterlijk terug, zonder dat de app ze hoeft te begrijpen.</li>
        </ol>

        <h3>De drie socratische bewegingen</h3>
        <ol class="w-list">
          <li class="${ctx.keys.includes('verhelder') ? 'is-now' : ''}">Verhelder begrippen en aannames</li>
          <li class="${ctx.keys.includes('redenen') ? 'is-now' : ''}">Onderzoek redenen en bewijs</li>
          <li class="${ctx.keys.includes('toets') ? 'is-now' : ''}">Toets en scherp de conclusie aan</li>
        </ol>
        <p class="w-bron">Collins en Stevens (1982), Kuhn en Crowell (2011)</p>
        <p class="w-keys">Toets W opent en sluit deze laag.</p>
      </div>`;
  }

  /* ---------- Render ---------- */

  function render() {
    const app = document.getElementById('app');
    let html = '';
    if (state.screen === 'intro') html = viewIntro();
    else if (state.screen === 'grens') html = viewGrens();
    else if (state.screen === 'verschil') html = viewVerschil();
    else if (state.screen === 'test') html = viewTest();
    else html = viewEind();
    app.innerHTML = html;
    document.getElementById('steps').innerHTML = steps();
    document.body.dataset.screen = state.screen;

    const view = `${state.screen}:${state.test ? state.test.id : ''}`;
    if (view !== lastView) {
      const eerste = lastView === '';
      lastView = view;
      window.scrollTo(0, 0);
      const h = app.querySelector('h1');
      if (h && !eerste) h.focus({ preventScroll: true });
    }
    renderWebinar();
  }

  /* ---------- Acties ---------- */

  function resetVanafStreep() {
    state.v = {};
    state.rule = freshRule();
    state.woorden = '';
    state.versions = [];
    state.judgments = [];
    state.shown = [];
    state.test = null;
    state.fields = { woorden: '', aanvulling: '', eigen: '', eind: '' };
  }

  function handle(action, el) {
    const T = state.test;
    switch (action) {
      case 'start':
        state.screen = 'grens'; break;

      case 'streep':
        state.line = Number(el.dataset.i); break;

      case 'grens-klaar':
        if (state.line === null) return;
        resetVanafStreep();
        if (state.line === 0) state.rule.base = 'none';
        if (state.line === LADDER.length) state.rule.base = 'all';
        state.screen = 'verschil';
        break;

      case 'verschil': {
        const d = el.dataset.d;
        const v = state.v;
        v.hint = null;
        if (d === 'anders') { v.choice = 'anders'; break; }
        const up = LADDER[state.line - 1], low = LADDER[state.line];
        if (up[d] === low[d]) {
          v.tried = (v.tried || []).concat(d);
          v.last = d;
          v.catch = `${DIMS[d].w[up[d]].beide} Daar zit het verschil dus niet in. Kijk nog eens naar de twee.`;
          break;
        }
        const r = freshRule();
        r.base = 'cond';
        r.c0 = { d, v: up[d] };
        state.rule = r;
        v.choice = d;
        break;
      }

      case 'woorden-klaar': {
        const tekst = state.fields.woorden.trim();
        if (tekst.length < 3) { state.v.hint = 'Schrijf in een paar woorden wat je bedoelt.'; break; }
        state.woorden = tekst;
        if (state.v.choice === 'anders') { state.rule = freshRule(); state.rule.own = tekst; }
        state.versions = [ruleString(state.rule)];
        state.screen = 'test';
        startTest();
        break;
      }

      case 'oordeel': {
        T.verdict = el.dataset.v === '1';
        if (state.rule.own !== null) { T.phase = 'eigenregel'; break; }
        T.pred = predict(state.rule, CASES[T.id]);
        state.judgments.push({ id: T.id, verdict: T.verdict, exempt: false });
        T.phase = T.pred === T.verdict ? 'houdt' : 'botst';
        break;
      }

      case 'eigen-oordeel':
        T.regelOordeel = el.dataset.v === '1';
        T.regelOud = state.rule.own;
        T.phase = T.regelOordeel === T.verdict ? 'houdt' : 'aanpassen';
        break;

      case 'eigen-opslaan': {
        const tekst = state.fields.eigen.trim();
        if (tekst.length < 3) break;
        state.rule.own = tekst;
        state.versions.push(tekst);
        T.phase = 'aangepast';
        break;
      }

      case 'verfijn': {
        const d = el.dataset.d;
        if (d === 'anders') { T.anders = true; break; }
        const t = CASES[T.id];
        const nieuw = clone(state.rule);
        if (T.pred) nieuw.req.push({ d, v: andere(d, t[d]) });   // regel zei "mag": extra voorwaarde
        else nieuw.or.push({ d, v: t[d] });                       // regel zei "mag niet": uitzondering
        const conflict = findConflict(nieuw);
        T.last = d;
        if (conflict) {
          T.tried = (T.tried || []).concat(d);
          T.catch = { id: conflict.c.id, verdict: conflict.verdict, pred: predict(nieuw, conflict.c) };
          break;
        }
        state.rule = nieuw;
        state.versions.push(ruleString(nieuw));
        T.catch = null;
        T.phase = 'aangepast';
        break;
      }

      case 'aanvulling-klaar': {
        const tekst = state.fields.aanvulling.trim();
        if (tekst.length < 3) { T.hint = 'Schrijf in een paar woorden wat het anders maakt.'; break; }
        state.rule.notes.push(tekst);
        const j = state.judgments.find(x => x.id === T.id);
        if (j) j.exempt = true;
        state.versions.push(ruleString(state.rule));
        T.last = 'anders';
        T.phase = 'aangepast';
        break;
      }

      case 'volgende':
        startTest();
        break;

      case 'verplaats':
        resetVanafStreep();
        state.screen = 'grens';
        break;

      case 'kopieer': {
        const tekst = state.fields.eind.trim() || ruleString(state.rule);
        const klaar = () => { state.gekopieerd = true; render(); setTimeout(() => { state.gekopieerd = false; render(); }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tekst).then(klaar, klaar);
        else klaar();
        return;
      }

      case 'opnieuw':
        state = fresh();
        break;

      default:
        return;
    }
    render();
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    handle(el.dataset.action, el);
  });

  document.addEventListener('input', e => {
    const f = e.target.dataset && e.target.dataset.field;
    if (f) state.fields[f] = e.target.value;
  });

  function toggleWebinar() {
    webinar.armed = true;
    webinar.open = !webinar.open;
    renderWebinar();
  }
  document.getElementById('webinar-toggle').addEventListener('click', () => { webinar.open = !webinar.open; renderWebinar(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'w' && e.key !== 'W') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    toggleWebinar();
  });

  const params = new URLSearchParams(location.search);
  if (params.has('webinar')) { webinar.armed = true; webinar.open = params.get('webinar') !== '0'; }
  render();
})();
