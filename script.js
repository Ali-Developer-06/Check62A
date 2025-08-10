// Initialize jsPDF
const { jsPDF } = window.jspdf;

// Recalculation functions
function recalculateAll() {
  const modus = document.querySelector('input[name="modus"]:checked').value;
  if (modus === "gemeinsam") {
    const eink1 = parseFloat(document.getElementById('einkommen1').value) || 0;
    const eink2 = parseFloat(document.getElementById('einkommen2').value) || 0;
    const part1 = parseFloat(document.getElementById('partner1').value) || 0;
    const kind1 = parseFloat(document.getElementById('kinder1').value) || 0;
    const part2 = parseFloat(document.getElementById('partner2').value) || 0;
    const kind2 = parseFloat(document.getElementById('kinder2').value) || 0;
    const chr1 = document.querySelector('input[name="chronisch1"]:checked').value === 'ja';
    const chr2 = document.querySelector('input[name="chronisch2"]:checked').value === 'ja';
    const grenzsatz = (chr1 && chr2) ? 0.01 : 0.02;

    const E = eink1 + eink2;
    const F = part1 + part2;
    const K = kind1 + kind2;
    const E_b = E - F - K;
    const G = E_b * grenzsatz;
    const R = E - G;

    document.getElementById('belastung1').value = G.toFixed(2);
    document.getElementById('bereinigt1').value = E_b.toFixed(2);
    document.getElementById('erstattung1').value = R.toFixed(2);

    document.getElementById('belastung2').value = "";
    document.getElementById('bereinigt2').value = "";
    document.getElementById('erstattung2').value = "";
  } else {
    recalculate(1);
    recalculate(2);
  }
}

function recalculate(p) {
  const einkommen = parseFloat(document.getElementById('einkommen' + p).value) || 0;
  const partner = parseFloat(document.getElementById('partner' + p).value) || 0;
  const kinder = parseFloat(document.getElementById('kinder' + p).value) || 0;
  const chronisch = document.querySelector('input[name="chronisch' + p + '"]:checked').value === 'ja';
  const grenze = chronisch ? 0.01 : 0.02;

  const belastung = einkommen * grenze;
  const bereinigt = einkommen - partner - kinder;
  const erstattung = einkommen - belastung;

  document.getElementById('belastung' + p).value = belastung.toFixed(2);
  document.getElementById('bereinigt' + p).value = bereinigt.toFixed(2);
  document.getElementById('erstattung' + p).value = erstattung.toFixed(2);
}

// Action application
function applyAction() {
  const aktion = document.getElementById("aktion").value;
  const monat = parseInt(document.getElementById("monatWirksamkeit").value) || 1;
  const monateRest = 12 - monat + 1;
  const log = document.getElementById("protokollausgabe");
  let ausgabe = "";

  if (aktion === "kind_geboren") {
    const feld = document.getElementById("kinder1");
    const alt = parseFloat(feld.value) || 0;
    const neu = alt + (800/12) * monateRest;
    feld.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kind im Monat ${monat} geboren<br>
                <strong>Formel:</strong> kinderfreibetrag += (800 / 12) * ${monateRest}<br>
                <strong>Alter Wert:</strong> ${alt.toFixed(2)}<br>
                <strong>Neuer Wert:</strong> ${neu.toFixed(2)}</div>`;
  }

  if (aktion === "ehe_trennung") {
    const feld = document.getElementById("partner1");
    const alt = parseFloat(feld.value) || 0;
    const neu = alt * 0.5;
    feld.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Partner verlässt Ehe im Monat ${monat}<br>
                <strong>Formel:</strong> partnerfreibetrag = partnerfreibetrag * 0.5<br>
                <strong>Alter Wert:</strong> ${alt.toFixed(2)}<br>
                <strong>Neuer Wert:</strong> ${neu.toFixed(2)}</div>`;
  }

  log.innerHTML += ausgabe;
  recalculateAll();
}

// PDF Generation with all user inputs

function generateCompletePDF() {
  try {
    if (!window.jspdf) {
      alert('jsPDF library not loaded. Please check internet connection.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Document settings
    doc.setProperties({
      title: 'GKV Application Overview',
      subject: 'Complete Application Data',
      author: 'GKV Check62 System'
    });

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 128);
    doc.text('GKV Check62 - Complete Application Data', 105, 20, { align: 'center' });
    
    // Helper functions
    const getValue = (id) => document.getElementById(id)?.value || 'not specified';
    const getRadioValue = (name) => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? (el.id.includes('_ja') ? 'Yes' : 'No') : 'No';
    };
    
    const getSelectedActionText = () => {
      const actionSelect = document.getElementById('aktion');
      return actionSelect.options[actionSelect.selectedIndex]?.textContent || 'None';
    };

    const getActionFormula = () => {
      const action = document.getElementById("aktion").value;
      const monat = parseInt(document.getElementById("monatWirksamkeit").value) || 1;
      const monateRest = 12 - monat + 1;
      
      const formulas = {
        kind_geboren: `Child Tax Allowance += (800 / 12) × ${monateRest} remaining months`,
        ehe_trennung: `Partner Allowance × 0.5 (effective month ${monat})`,
        tod_kind: `Child Tax Allowance -= (800 / 12) × ${monateRest} remaining months`,
        partner_privat: `Annual Income += (Private Insurance Cost × ${monateRest})`,
        kapitalauszahlung: `Annual Income + 10,000 lump sum`,
        ausbildung_kind: `Child Tax Allowance -= (800 / 12) × ${monateRest}`,
        krankenkassenwechsel: `No calculation impact (requires document transfer)`,
        pflegeheim: `Annual Income -= (600 × ${monateRest}) nursing home allowance`,
        kurzarbeit: `Annual Income -= ((Monthly Income - 800) × ${monateRest})`,
        heirat_ausland: `Partner Allowance = 6,363 for both`,
        selbststaendig: `Annual Income += (5,000 × ${monateRest})`,
        unterstützung: `Annual Income += (2,000 × ${monateRest})`
      };
      
      return formulas[action] || 'No formula applied';
    };

    // 1. Personal Data Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('1. Basic Information', 14, 35);
    
    // Personal Data Tables (unchanged)
    const personalData1 = [
      ['Last Name:', getValue('name1')],
      ['First Name:', getValue('vorname1')],
      ['Insurance Number:', getValue('vers1')],
      ['IBAN:', getValue('iban1')],
      ['Address:', `${getValue('strasse1')}, ${getValue('plz1')}`],
      ['Chronically Ill:', getRadioValue('chronisch1')]
    ];
    
    const personalData2 = [
      ['Last Name:', getValue('name2')],
      ['First Name:', getValue('vorname2')],
      ['Insurance Number:', getValue('vers2')],
      ['IBAN:', getValue('iban2')],
      ['Address:', `${getValue('strasse2')}, ${getValue('plz2')}`],
      ['Chronically Ill:', getRadioValue('chronisch2')]
    ];

    doc.autoTable({
      startY: 40,
      head: [['Person 1', '']],
      body: personalData1,
      theme: 'grid',
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Person 2', '']],
      body: personalData2,
      theme: 'grid',
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // 2. Financial Data Section (unchanged)
    doc.text('2. Financial Data', 14, doc.lastAutoTable.finalY + 15);
    
    const financialData = [
      ['Annual Income', getValue('einkommen1'), getValue('einkommen2')],
      ['Partner Tax Allowance', getValue('partner1'), getValue('partner2')],
      ['Child Tax Allowance', getValue('kinder1'), getValue('kinder2')],
      ['Threshold', getValue('belastung1'), getValue('belastung2')],
      ['Adjusted Income', getValue('bereinigt1'), getValue('bereinigt2')],
      ['Reimbursement Amount', getValue('erstattung1'), getValue('erstattung2')]
    ];

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['', 'Person 1', 'Person 2']],
      body: financialData,
      theme: 'grid',
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      }
    });

    // 3. Enhanced Settings Section with Formulas
    doc.text('3. Settings & Action Details', 14, doc.lastAutoTable.finalY + 15);
    
    const settingsData = [
      ['Calculation Type:', document.getElementById('modus_gemeinsam').checked ? 'Together' : 'Separate'],
      ['Selected Action:', getSelectedActionText()],
      ['Effective from Month:', getValue('monatWirksamkeit') || 'Not specified'],
      ['Applied Formula:', getActionFormula()]
    ];

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      body: settingsData,
      theme: 'grid',
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 60 }
      }
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Created on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`, 105, 285, { align: 'center' });

    // Save PDF
    setTimeout(() => {
      doc.save('GKV-Complete-Data.pdf');
    }, 200);
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    alert('Error creating PDF: ' + error.message);
  }
}

// Language toggle
function toggleLanguage() {
  const currentLang = document.body.getAttribute("data-lang") || "en";
  const newLang = currentLang === "en" ? "de" : "en";
  document.body.setAttribute("data-lang", newLang);

  document.querySelectorAll("[data-lang-de][data-lang-en]").forEach(el => {
    el.textContent = el.getAttribute(`data-lang-${newLang}`);
  });
}

// Initialize on load
window.onload = function() {
  document.body.setAttribute("data-lang", "en");
  recalculateAll();
  recalculate(1);
  recalculate(2);
}