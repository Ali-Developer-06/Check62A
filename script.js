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

// ===== helpers =====
function setModus(value) {
  const radios = document.querySelectorAll('input[name="modus"]');
  radios.forEach(r => { if (r.value === value) r.checked = true; });
}
function setChronisch(person, ja) {
  const yes = document.querySelector(`input[name="chronisch${person}"][value="ja"]`);
  const no  = document.querySelector(`input[name="chronisch${person}"][value="nein"]`);
  if (yes && no) (ja ? yes : no).checked = true;
}

// ===== master applyAction with all 50 cases =====

function applyAction() {
  const aktion = document.getElementById("aktion").value;
  const monat  = parseInt(document.getElementById("monatWirksamkeit").value) || 1;
  const monateRest = 12 - monat + 1;

  const log = document.getElementById("protokollausgabe");
  let ausgabe = "";

  // Shortcuts for common fields (Person 1 by default)
  const einkFeld1 = document.getElementById("einkommen1");
  const einkFeld2 = document.getElementById("einkommen2");
  const part1 = document.getElementById("partner1");
  const part2 = document.getElementById("partner2");
  const kind1 = document.getElementById("kinder1");
  const kind2 = document.getElementById("kinder2");

  // Make sure numeric reads
  const num = v => parseFloat(v) || 0;

  // 1. Geburt eines Kindes
  if (aktion === "geburt_kind" || aktion === "kind_geboren") {
    const alt = num(kind1.value);
    const neu = alt + (800/12) * monateRest;
    kind1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Geburt/Kind im Monat ${monat}<br>
                <strong>Formel:</strong> kinderfreibetrag += (800/12) × ${monateRest}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 2. Tod eines Kindes
  else if (aktion === "tod_kind") {
    const alt = num(kind1.value);
    const neu = alt - (800/12) * monateRest;
    kind1.value = Math.max(0, neu).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Tod eines Kindes (ab Folgemonat) – Monat ${monat}<br>
                <strong>Formel:</strong> kinderfreibetrag -= (800/12) × ${monateRest}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${Math.max(0, neu).toFixed(2)}</div>`;
  }

  // 3. Trennung/Scheidung
  else if (aktion === "trennung") {
    const alt1 = num(part1.value), alt2 = num(part2.value);
    part1.value = "0"; part2.value = "0";
    setModus("getrennt");
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Trennung/Scheidung – Monat ${monat}<br>
                <strong>Auswirkung:</strong> Partner-Freibetrag beide = 0, Modus = getrennt<br>
                <strong>P1 vorher:</strong> ${alt1.toFixed(2)}, <strong>P2 vorher:</strong> ${alt2.toFixed(2)}</div>`;
  }

  // 4. Heirat/Partnerschaft
  else if (aktion === "heirat") {
    const freibetrag = 6363;
    part1.value = freibetrag.toFixed(2);
    part2.value = freibetrag.toFixed(2);
    setModus("gemeinsam");
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Heirat/Partnerschaft – Monat ${monat}<br>
              <strong>Formel:</strong> partnerfreibetrag = ${freibetrag} (beide), Modus = gemeinsam</div>`;
  }

  // 5. Ein Partner chronisch krank
  else if (aktion === "chronisch_krank") {
    const p = prompt("Chronisch krank für Person (1 oder 2):");
    if (p === "1" || p === "2") {
      setChronisch(p, true);
      ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Chronische Krankheit – Person ${p}<br>
                  <strong>Auswirkung:</strong> Belastungsgrenze 1% statt 2%</div>`;
    } else {
      ausgabe = `<div class='log-entry' style='color:red'><strong>Hinweis:</strong> Ungültige Personnummer!</div>`;
    }
  }

  // 6. Unterschiedliche gesetzliche Kassen
  else if (aktion === "kassen_unterschied") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Unterschiedliche gesetzliche Kassen<br>
                <strong>Hinweis:</strong> Zuzahlungen separat einreichbar – keine Formeländerung</div>`;
  }

  // 7. Ein Partner privat versichert
  else if (aktion === "partner_privat") {
    const pkvProMonat = num(prompt("Monatliche PKV-Kosten, z.B. 300:") || "300");
    const alt = num(einkFeld1.value);
    const neu = alt + pkvProMonat * monateRest;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Partner privat versichert – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${pkvProMonat} × ${monateRest}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 8. Eintritt GKV während des Jahres
  else if (aktion === "gkv_eintritt") {
    const alt = num(einkFeld1.value);
    const neu = alt * (monateRest / 12);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Eintritt GKV – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen × (${monateRest}/12)<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 9. Auslandsaufenthalt
  else if (aktion === "ausland") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Auslandsaufenthalt – ab Monat ${monat}<br>
                <strong>Hinweis:</strong> Zuzahlungen im Ausland meist nicht anerkannt</div>`;
  }

  // 10. Pflegebedürftigkeit im Jahr
  else if (aktion === "pflegebeduerftig") {
    const frei = 600 * monateRest;
    const alt = num(einkFeld1.value);
    const neu = Math.max(0, alt - frei);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Pflegebedürftigkeit – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen -= 600 × ${monateRest} = ${frei.toFixed(2)}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 11. Härtefall (hohe Kosten)
  else if (aktion === "haertefall") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Härtefall (hohe Kosten) – ab Monat ${monat}<br>
                <strong>Hinweis:</strong> Frühzeitige Befreiung möglich (manuelle Prüfung)</div>`;
  }

  // 12. Steuerklassenwechsel
  else if (aktion === "steuerklasse") {
    const faktor = num(prompt("Netto-Faktor (z.B. 0.85):") || "0.85");
    const alt = num(einkFeld1.value);
    const neu = alt * faktor;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Steuerklassenwechsel – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen × ${faktor}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 13. Rentenbeginn
  else if (aktion === "rente_beginn") {
    const rente = num(prompt("Monatliche Rente:") || "0");
    const jahresRente = rente * monateRest;
    einkFeld1.value = jahresRente.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Rentenbeginn – Monat ${monat}<br>
                <strong>Formel:</strong> ${rente} × ${monateRest} = ${jahresRente.toFixed(2)}</div>`;
  }

  // 14. Kapitalauszahlung
  else if (aktion === "kapitalauszahlung") {
    const kapital = num(prompt("Lump-sum capital payout (einmalig):") || "10000");
    const alt = num(einkFeld1.value);
    const neu = alt + kapital;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kapitalauszahlung – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${kapital.toFixed(2)}<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 15. Kind zieht aus
  else if (aktion === "kind_auszug") {
    const alt = num(kind1.value);
    const neu = alt - (800/12) * monateRest;
    kind1.value = Math.max(0, neu).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kind ausgezogen – Monat ${monat}<br>
                <strong>Formel:</strong> kinderfreibetrag -= (800/12) × ${monateRest}</div>`;
  }

  // 16. Pflege eines Angehörigen (pflegender)
  else if (aktion === "pflege_angehoeriger") {
    const frei = 600 * monateRest;
    const alt = num(einkFeld1.value);
    const neu = Math.max(0, alt - frei);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Pflege Angehöriger – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen -= 600 × ${monateRest}</div>`;
  }

  // 17. Wohngeld/Grundsicherung
  else if (aktion === "wohngeld") {
    document.getElementById("belastung1").value = "0";
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Wohngeld/Grundsicherung – ab Monat ${monat}<br>
                <strong>Auswirkung:</strong> Automatische Befreiung – Belastungsgrenze = 0</div>`;
  }

  // 18. Teilzeit/Vollzeit-Wechsel
  else if (aktion === "arbeitszeit") {
    const proz = num(prompt("Neue Arbeitszeit in % (z.B. 50):") || "100");
    const alt = num(einkFeld1.value);
    const neu = alt * (proz/100);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Arbeitszeitänderung – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen × ${proz}%<br>
                <strong>Vorher:</strong> ${alt.toFixed(2)} – <strong>Neu:</strong> ${neu.toFixed(2)}</div>`;
  }

  // 19. Ausbildungsstart Kind
  else if (aktion === "ausbildung_kind") {
    const alt = num(kind1.value);
    const neu = alt - (800/12) * monateRest;
    kind1.value = Math.max(0, neu).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Ausbildungsstart Kind – Monat ${monat}<br>
                <strong>Formel:</strong> kinderfreibetrag -= (800/12) × ${monateRest}</div>`;
  }

  // 20. Familienversicherung (Partner)
  else if (aktion === "familienversicherung") {
    einkFeld2.value = "0";
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Familienversicherung – ab Monat ${monat}<br>
                <strong>Auswirkung:</strong> Nur Einkommen des Versicherten zählt (Partner = 0)</div>`;
  }

  // 21. Elterngeld
  else if (aktion === "elterngeld") {
    const betrag = num(prompt("Monatliches Elterngeld:") || "0");
    const steuerpf = betrag * 0.33 * monateRest; // 33% anrechenbar (vereinfachung)
    const alt = num(einkFeld1.value);
    const neu = alt + steuerpf;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Elterngeld – ab Monat ${monat}<br>
                <strong>Anrechnung:</strong> 33% × ${betrag} × ${monateRest} = ${steuerpf.toFixed(2)}</div>`;
  }

  // 22. Krankengeld
  else if (aktion === "krankengeld") {
    const betrag = num(prompt("Monatliches Krankengeld:") || "0");
    einkFeld1.value = (betrag * monateRest).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Krankengeld – ab Monat ${monat}<br>
                <strong>Formel:</strong> ${betrag} × ${monateRest}</div>`;
  }

  // 23. ALG I
  else if (aktion === "alg1") {
    const betrag = num(prompt("Monatliches ALG I:") || "0");
    einkFeld1.value = (betrag * monateRest).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> ALG I – ab Monat ${monat}<br>
                <strong>Formel:</strong> ${betrag} × ${monateRest}</div>`;
  }

  // 24. ALG II / Bürgergeld
  else if (aktion === "alg2") {
    document.getElementById("belastung1").value = "0";
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> ALG II / Bürgergeld – ab Monat ${monat}<br>
                <strong>Auswirkung:</strong> Automatische Befreiung – Belastungsgrenze = 0</div>`;
  }

  // 25. Arbeitsaufnahme
  else if (aktion === "arbeitsaufnahme") {
    const monGehalt = num(prompt("Monatsgehalt neue Stelle:") || "0");
    einkFeld1.value = (monGehalt * monateRest).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Arbeitsaufnahme – Monat ${monat}<br>
                <strong>Formel:</strong> ${monGehalt} × ${monateRest}</div>`;
  }

  // 26. Waisenrente Kind
  else if (aktion === "waisenrente") {
    const betrag = num(prompt("Monatliche Waisenrente:") || "0");
    const alt = num(kind1.value);
    const neu = alt + betrag * monateRest;
    kind1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Waisenrente – ab Monat ${monat}<br>
                <strong>Freibetrag +</strong> ${betrag} × ${monateRest}</div>`;
  }

  // 27. Unterhalt (zahlend/empfangend)
  else if (aktion === "unterhalt") {
    const typ = (prompt("Unterhalt (z=zahlend / e=empfangend):") || "").toLowerCase();
    const betrag = num(prompt("Monatlicher Unterhalt:") || "0");
    const yr = betrag * monateRest;
    const alt = num(einkFeld1.value);
    const neu = typ === "z" ? alt - yr : alt + yr;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Unterhalt (${typ==="z"?"zahlend":"empfangend"}) – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen ${typ==="z"?"-=":"+="} ${yr.toFixed(2)}</div>`;
  }

  // 28. Wechsel zu freiwilliger GKV
  else if (aktion === "freiwillig_gkv") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Wechsel zu freiwilliger GKV<br>
                <strong>Hinweis:</strong> Keine Berechnungsänderung</div>`;
  }

  // 29. Krankenkassenwechsel
  else if (aktion === "krankenkassenwechsel") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Krankenkassenwechsel – Monat ${monat}<br>
                <strong>Hinweis:</strong> Belege übertragen – keine direkte Formeländerung</div>`;
  }

  // 30. Befreiung Vorjahr
  else if (aktion === "befreiung_vorjahr") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Befreiung Vorjahr<br>
                <strong>Hinweis:</strong> Voranerkennung möglich (manuell prüfen)</div>`;
  }

  // 31. Pflegegradänderung (Nr.31)
  else if (aktion === "pflegegrad") {
    let grad = parseInt(prompt("Neuer Pflegegrad (1-5 eingeben):") || "0");
    // Validate input (1-5 only)
    grad = Math.max(1, Math.min(5, grad)); // Forces value between 1-5
    
    const pflegestufen = {
        1: 300,  // Pflegegrad 1
        2: 450,  // Pflegegrad 2
        3: 600,  // Pflegegrad 3
        4: 750,  // Pflegegrad 4
        5: 900   // Pflegegrad 5
    };
    
    const freibetrag = pflegestufen[grad] * monateRest;
    const alt = num(einkFeld1.value);
    const neu = Math.max(0, alt - freibetrag);
    
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'>
        <strong>Aktion:</strong> Pflegegradänderung (Stufe ${grad}) – ab Monat ${monat}<br>
        <strong>Formel:</strong> Einkommen -= ${pflegestufen[grad]} × ${monateRest} Monate<br>
        <strong>Freibetrag:</strong> ${freibetrag.toFixed(2)}<br>
        <strong>Vorher:</strong> ${alt.toFixed(2)} → <strong>Neu:</strong> ${neu.toFixed(2)}
    </div>`;
}

  // 32. Heimunterbringung Angehöriger
  else if (aktion === "pflegeheim") {
    const frei = 600 * monateRest;
    const alt = num(einkFeld1.value);
    const neu = Math.max(0, alt - frei);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Heimunterbringung Angehöriger – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen -= 600 × ${monateRest}</div>`;
  }

  // 33. Hausverkauf mit Gewinn
  else if (aktion === "hausverkauf") {
    const gewinn = num(prompt("Kapitalgewinn (einmalig):") || "0");
    const alt = num(einkFeld1.value);
    const neu = alt + gewinn;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Hausverkauf – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${gewinn.toFixed(2)}</div>`;
  }

  // 34. Ehrenamt (Nr.34)
  else if (aktion === "ehrenamt") {
    const verguetung = prompt("Jährliche Ehrenamtsvergütung eingeben:");
    const freibetrag = Math.min(840, verguetung); // Max. 840€ Freibetrag
    const einkommen = parseFloat(document.getElementById("einkommen1").value) || 0;
    document.getElementById("einkommen1").value = (einkommen + verguetung - freibetrag).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Ehrenamt ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen + ${verguetung} - ${freibetrag} (Freibetrag)<br>
                <strong>Nettozugang:</strong> ${(verguetung - freibetrag).toFixed(2)}</div>`;
  }

  // 35. Unterhalt durch Scheidung (zahlpflichtig)
  else if (aktion === "scheidung_unterhalt") {
    const betrag = num(prompt("Monatlicher Unterhalt (Pflicht):") || "0");
    const yr = betrag * monateRest;
    const alt = num(einkFeld1.value);
    const neu = Math.max(0, alt - yr);
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Unterhaltspflicht durch Scheidung – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen -= ${betrag} × ${monateRest} = ${yr.toFixed(2)}</div>`;
  }

  // 36. Kapitalerträge
  else if (aktion === "kapitalertraege") {
    const ertrag = num(prompt("Anzurechnende Kapitalerträge über Freibetrag:") || "0");
    const alt = num(einkFeld1.value);
    const neu = alt + ertrag;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kapitalerträge – Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${ertrag.toFixed(2)}</div>`;
  }

  // 37. Kindergeldzuschlag (kein Einfluss)
  else if (aktion === "kindergeldzuschlag") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kindergeldzuschlag – ab Monat ${monat}<br>
                <strong>Hinweis:</strong> Kein Einfluss auf Einkommen</div>`;
  }

  // 38. Steuererstattung (kein Einfluss)
  else if (aktion === "steuererstattung") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Steuererstattung – Monat ${monat}<br>
                <strong>Hinweis:</strong> Keine Anrechnung auf Einkommen</div>`;
  }

  // 39. Selbstständigkeit → Anstellung
  else if (aktion === "selbststaendig_anstellung") {
    const jahresgehalt = num(prompt("Jahresgehalt neuer Anstellung:") || "0");
    einkFeld1.value = jahresgehalt.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Wechsel zur Anstellung – Monat ${monat}<br>
                <strong>Neues Jahreseinkommen:</strong> ${jahresgehalt.toFixed(2)}</div>`;
  }

  // 40. Kurzarbeit
  if (aktion === "kurzarbeit") {
    const kurzarbeitGeld = 800; // Example short-time work benefit
    const einkommen = parseFloat(document.getElementById("einkommen1").value) || 0;
    const neu = einkommen - ((einkommen/12 - kurzarbeitGeld) * monateRest);
    document.getElementById("einkommen1").value = Math.max(0, neu).toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Kurzarbeit ab Monat ${monat}<br>
               <strong>Formel:</strong> jahreseinkommen -= ((einkommen/12 - 800) * ${monateRest})<br>
                <strong>Neuer Wert:</strong> ${Math.max(0, neu).toFixed(2)}</div>`;
  }

  // 41. Teilrente
  else if (aktion === "teilrente") {
    const rente = num(prompt("Monatliche Teilrente:") || "0");
    const jahresRente = rente * monateRest;
    const alt = num(einkFeld1.value);
    const neu = alt * 0.5 + jahresRente;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Teilrente – ab Monat ${monat}<br>
                <strong>Formel:</strong> (altes Einkommen × 50%) + (${rente} × ${monateRest})</div>`;
  }

  // 42. Pflege durch Partner (kein Einfluss)
  else if (aktion === "pflege_partner") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Pflege durch Partner – ab Monat ${monat}<br>
                  <strong>Hinweis:</strong> Keine Relevanz für Einkommen</div>`;
  }

  // 43. Heirat im Ausland
  else if (aktion === "heirat_ausland") {
    const freibetrag = 6363;
    part1.value = freibetrag.toFixed(2);
    part2.value = freibetrag.toFixed(2);
    setModus("gemeinsam");
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Heirat im Ausland – Monat ${monat}<br>
                <strong>Regel:</strong> Wie Inlandsheirat (Partner-Freibetrag, gemeinsam)</div>`;
  }

// 44. Versicherung über Eltern (Nr.44)
else if (aktion === "familienversicherung_uebergang") {
    const maxEinkommen = 485 * monateRest; // 485€/Monat Grenze
    const einkommen = num(prompt("Jahreseinkommen des Kindes:") || "0");
    
    if (einkommen > maxEinkommen) {
        ausgabe = `<div class='log-entry' style='color:red'>
            <strong>Aktion:</strong> Familienversicherung nicht möglich!<br>
            <strong>Grund:</strong> Einkommen (${einkommen.toFixed(2)}) > ${maxEinkommen.toFixed(2)}€ Grenze
        </div>`;
    } else {
        ausgabe = `<div class='log-entry'>
            <strong>Aktion:</strong> Familienversicherung möglich – Monat ${monat}<br>
            <strong>Bedingung:</strong> Einkommen ≤ ${maxEinkommen.toFixed(2)}€ (${einkommen.toFixed(2)}€)
        </div>`;
    }
}

// 45. Erbe (Nr.45)
else if (aktion === "erbe") {
    const betrag = prompt("Erbhöhe eingeben:");
    document.getElementById("einkommen1").value = (parseFloat(document.getElementById("einkommen1").value) || 0) + parseFloat(betrag);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Erbe erhalten im Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${betrag}<br>
                <strong>Hinweis:</strong> Nur bei laufenden Zahlungen relevant</div>`;
  }

  // 46. Schuldenabbau (kein Einfluss)
  else if (aktion === "schuldenabbau") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Schuldenabbau durch Tilgung – Monat ${monat}<br>
                <strong>Hinweis:</strong> Keine Auswirkung auf GKV-Berechnung</div>`;
  }

  // 47. Geldgeschenk
  else if (aktion === "geldgeschenk") {
    const betrag = num(prompt("Betrag des Geldgeschenks:") || "0");
    const regelm = confirm("Regelmäßige Zahlung?");
    if (regelm) {
      const alt = num(einkFeld1.value);
      const neu = alt + betrag;
      einkFeld1.value = neu.toFixed(2);
      ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Regelmäßiges Geldgeschenk – Monat ${monat}<br>
                  <strong>Formel:</strong> Einkommen += ${betrag.toFixed(2)}</div>`;
    } else {
      ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Einmaliges Geldgeschenk – Monat ${monat}<br>
                  <strong>Hinweis:</strong> Nicht als Einkommen anrechenbar</div>`;
    }
  }

  // 48. Selbstständige Einkünfte
  else if (aktion === "selbststaendig") {
    const mon = num(prompt("Monatliche selbstständige Einkünfte (Netto):") || "0");
    const alt = num(einkFeld1.value);
    const neu = alt + mon * monateRest;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Selbstständige Einkünfte – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${mon} × ${monateRest}</div>`;
  }

  // 49. Unterstützung durch Dritte
  else if (aktion === "unterstuetzung") {
    const mon = num(prompt("Monatliche Unterstützung (nachweisbar):") || "0");
    const alt = num(einkFeld1.value);
    const neu = alt + mon * monateRest;
    einkFeld1.value = neu.toFixed(2);
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Unterstützung durch Dritte – ab Monat ${monat}<br>
                <strong>Formel:</strong> Einkommen += ${mon} × ${monateRest}</div>`;
  }

  // 50. Platzhalter-Sonderfall
  else if (aktion === "platzhalter") {
    ausgabe = `<div class='log-entry'><strong>Aktion:</strong> Platzhalter-Sonderfall<br>
                <strong>Hinweis:</strong> Keine spezifische Berechnung</div>`;
  }

  // Unknown action
  else {
    ausgabe = `<div class='log-entry' style='color:#b00'><strong>Hinweis:</strong> Bitte eine gültige Aktion wählen.</div>`;
  }

  // Output + recalc
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
        geburt_kind: `Child Allowance += (800/12) × ${monateRest} months`,
        tod_kind: `Child Allowance -= (800/12) × ${monateRest} months`,
        trennung: `Partner Allowance = 0 (switch to separate calculation)`,
        heirat: `Partner Allowance = 6,363 (switch to joint calculation)`,
        chronisch_krank: `Threshold reduced to 1% for selected person`,
        kassen_unterschied: `No calculation impact (separate billing)`,
        partner_privat: `Income += (PKV Costs × ${monateRest})`,
        gkv_eintritt: `Income × (${monateRest}/12) for pro-rated amount`,
        ausland: `No foreign payments recognized`,
        pflegebeduerftig: `Income -= (600 × ${monateRest}) care allowance`,
        haertefall: `Early exemption possible (manual review)`,
        steuerklasse: `Income × Netto-Factor (e.g., 0.85)`,
        rente_beginn: `Pension × ${monateRest} months`,
        kapitalauszahlung: `Income += Lump-sum amount`,
        kind_auszug: `Child Allowance -= (800/12) × ${monateRest}`,
        pflege_angehoeriger: `Income -= (600 × ${monateRest}) care allowance`,
        wohngeld: `Automatic exemption (threshold = 0)`,
        arbeitszeit: `Income × (Work Percentage/100)`,
        ausbildung_kind: `Child Allowance -= (800/12) × ${monateRest}`,
        familienversicherung: `Partner Income = 0 (family insurance)`,
        elterngeld: `Income += (Parental Allowance × 33%) × ${monateRest}`,
        krankengeld: `Sickness Benefit × ${monateRest} months`,
        alg1: `Unemployment Benefit I × ${monateRest} months`,
        alg2: `Automatic exemption (threshold = 0)`,
        arbeitsaufnahme: `New Salary × ${monateRest} months`,
        waisenrente: `Child Allowance += (Orphan's Pension × ${monateRest})`,
        unterhalt: `Income ${document.querySelector('input[name="unterhalt_typ"]:checked')?.value === 'z' ? '-' : '+'}= (Maintenance × ${monateRest})`,
        freiwillig_gkv: `No calculation impact`,
        krankenkassenwechsel: `No calculation impact (document transfer)`,
        befreiung_vorjahr: `Prior year exemption (manual review)`,
        pflegegrad: `Income -= (Care Grade Amount × ${monateRest})`,
        pflegeheim: `Income -= (600 × ${monateRest}) nursing home costs`,
        hausverkauf: `Income += Capital Gains (one-time)`,
        ehrenamt: `Income += (Honorarium - min(840, Honorarium))`,
        scheidung_unterhalt: `Income -= (Maintenance × ${monateRest})`,
        kapitalertraege: `Income += Capital Gains above allowance`,
        kindergeldzuschlag: `No income impact`,
        steuererstattung: `No income impact`,
        selbststaendig_anstellung: `Income = New Salary (full replacement)`,
        kurzarbeit: `Income -= ((Previous Salary - Short-time Allowance) × ${monateRest})`,
        teilrente: `(Previous Income × 50%) + (Partial Pension × ${monateRest})`,
        pflege_partner: `No income impact`,
        heirat_ausland: `Partner Allowance = 6,363 (as domestic marriage)`,
        familienversicherung_uebergang: `Income must be ≤ ${485*monateRest} (€485/month limit)`,
        erbe: `Income += Inheritance (if recurring payments)`,
        schuldenabbau: `No income impact`,
        geldgeschenk: `Income += Gift Amount (if regular payments)`,
        selbststaendig: `Income += (Freelance Earnings × ${monateRest})`,
        unterstützung: `Income += (Support Payments × ${monateRest})`,
        platzhalter: `No specific calculation`
      };
      
      return formulas[action] || 'No specific formula applied';
    };

    // 1. Personal Data Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('1. Basic Information', 14, 35);
    
    // Personal Data Tables
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

    // 2. Financial Data Section
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

    // 3. Settings Section with Formulas
    doc.text('3. Settings & Applied Formulas', 14, doc.lastAutoTable.finalY + 15);
    
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
        1: { cellWidth: 100 }
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