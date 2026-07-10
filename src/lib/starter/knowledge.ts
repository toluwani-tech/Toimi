/**
 * Curated Finnish knowledge base for the AI Starter advisor. This is checked into
 * the repo (not a vector store) because the content volume doesn't yet justify
 * retrieval infrastructure — see the roadmap in twinkling-knitting-moth.md.
 *
 * This is general guidance, not professional tax/legal advice. The system prompt
 * built from this instructs the model to say so and to recommend an accountant or
 * lawyer for anything trade-specific or high-stakes — matching the business plan's
 * "Regulatory content accuracy" risk mitigation.
 */
export const STARTER_KNOWLEDGE_BASE = `
## Toiminimi vs. osakeyhtiö (Oy)

- Toiminimi (yksityinen elinkeinonharjoittaja): nopea ja halpa perustaa, ei erillistä
  peruspääomaa, mutta yrittäjä vastaa veloista koko henkilökohtaisella omaisuudellaan.
  Sopii usein yksinyrittäjälle alkuvaiheessa, kevyempi kirjanpito.
- Osakeyhtiö (Oy): vaatii 2 500 euron osakepääoman, erillinen oikeushenkilö, yrittäjän
  vastuu rajoittuu pääsääntöisesti sijoitettuun pääomaan. Raskaampi hallinto ja
  kirjanpito, mutta usein perusteltu heti, jos liikevaihto tai riskit (esim.
  aliurakointi, työntekijöiden palkkaus) ovat suuria alusta alkaen.
- Yleinen nyrkkisääntö: aloita toiminimellä, jos olet yksin, riskit ovat pieniä ja
  liikevaihto on aluksi matala; harkitse Oy:tä, jos palkkaat työntekijöitä nopeasti,
  otat isompia urakoita tai haluat rajata henkilökohtaista vastuuta.

## Rekisteröinti

1. Valitse yritysmuoto ja toiminimi.
2. Ilmoittaudu kaupparekisteriin ja verohallinnon rekistereihin (ennakkoperintärekisteri,
   ALV-rekisteri tarvittaessa, työnantajarekisteri jos palkkaat).
3. Hae Y-tunnus (perustamisilmoitus YTJ:n kautta).
4. Avaa yrityksen pankkitili.
5. Järjestä kirjanpito (oma tai tilitoimisto).

## ALV ja rakennusalan käännetty arvonlisävero

- ALV-rekisteröinti on pakollinen, jos liikevaihto ylittää alarajan (tarkista ajantasainen
  raja verohallinnolta — se on muuttunut viime vuosina).
- Rakennusalalla sovelletaan usein käännettyä arvonlisäveroa: alihankkijana toiselle
  rakennusalan yritykselle laskutat ilman ALV:ia, ja ostaja tilittää veron. Tämä koskee
  vain rakentamispalveluita toiselle elinkeinonharjoittajalle, joka myy rakentamispalveluita
  muuten kuin satunnaisesti — tarkista aina tilanne tilitoimistolta tai verohallinnolta,
  koska soveltuvuus riippuu asiakkaan roolista.

## YEL-vakuutus

- Yrittäjän eläkevakuutus (YEL) on pakollinen, jos yrittäjätulo ylittää vuosittaisen
  alarajan ja työ kestää yli neljä kuukautta.
  YEL-työtulo vaikuttaa sekä eläkkeeseen että moniin muihin etuuksiin (esim.
  sairauspäiväraha, työttömyysturva), joten sitä ei kannata alimitoittaa pelkästään
  maksujen pienentämiseksi.
- YEL-vakuutus otetaan valitulta eläkevakuutusyhtiöltä 6 kuukauden sisällä yritystoiminnan
  aloittamisesta; myöhässä ottaminen voi johtaa korotettuun maksuun takautuvasti.

## Vakuutukset ja luvat

- Toiminnan vastuuvakuutus on lähes aina suositeltava/välttämätön rakennusalalla —
  se kattaa asiakkaalle tai kolmannelle aiheutuneita vahinkoja.
- Alasta riippuen voidaan tarvita erillisiä pätevyyksiä tai lupia (esim. sähkötöissä
  sähköalan pätevyystodistus ja rekisteröinti Tukesiin, kuumatöissä kuumatyökortti,
  putkitöissä tietyt vesi- ja viemärityön pätevyysvaatimukset). Selvitä aina oman alasi
  vaatimukset ennen töiden aloittamista.

## Hinnoittelu

- Yleisin syy pienyrittäjän epäonnistumiseen on alihinnoittelu: tuntiveloitus lasketaan
  usein vain palkkatoiveen mukaan, unohtaen sivukulut (YEL, vakuutukset, työkalut,
  ajoneuvo, laskuttamattomat hallintotunnit, lomat, sairauspäivät).
- Nyrkkisääntö: laske ensin haluttu vuositulo, lisää kaikki yrityksen kiinteät ja
  muuttuvat kulut, jaa laskutettavissa olevien tuntien määrällä (ei kaikilla työtunneilla —
  hallintoon ja matkoihin kuluu aikaa, jota ei voi laskuttaa täysimääräisesti).
- Tarjoa aina kirjallinen tarjous ennen työn aloittamista ja hinnoittele materiaalit
  erikseen työstä.

## Ensimmäiset asiakkaat ja markkinointi

- Suositukset ja verkostot (muut käsityöläiset, tilitoimistot, rakennusliikkeet)
  tuovat usein ensimmäiset työt.
- Paikallinen näkyvyys: Google-yritysprofiili, sosiaalinen media omista töistä,
  ammattijärjestöjen ja Suomen Yrittäjien paikallisyhdistysten jäsenyys.
- Pyydä aina arvostelu tyytyväiseltä asiakkaalta — se on tehokkain markkinointikeino
  pienelle käsityöläisyritykselle.

## Yleisimmät syyt epäonnistumiseen

- Alihinnoittelu ja kassavirran hallitsematon seuranta.
- Liian myöhään otettu YEL tai vakuutukset.
- Ei kirjallisia tarjouksia/sopimuksia, mikä johtaa maksuriitoihin.
- Yksin yrittäminen ilman verkostoa tai tukea vaikeina aikoina.
`.trim();

export function buildStarterSystemPrompt(): string {
  return `Olet Toimin AI-liiketoimintaneuvoja suomalaisille käsityöläisille (sähköasentajat,
putkimiehet, kirvesmiehet, maalarit ja muut pienurakoitsijat), jotka harkitsevat tai ovat
juuri aloittamassa yritystoimintaa.

TEHTÄVÄSI:
1. Kysy ensin lyhyesti käyttäjän ammatti/ala, tämänhetkinen tilanne (palkkatyössä vai jo
   yrittäjänä), ja tavoitteet — ÄLÄ anna vielä konkreettista neuvoa ennen kuin tiedät nämä.
   Kysy yksi tai kaksi selkeää kysymystä kerrallaan, älä tenttaa liikaa yhdellä kertaa.
2. Kun tiedät riittävästi (ala + tilanne + tavoite), siirry neuvomaan: yritysmuoto
   (toiminimi vs. Oy) perusteluineen, rekisteröinti, ALV ja käännetty ALV, YEL,
   vakuutukset/luvat, hinnoittelu ja asiakashankinta. Käytä alla olevaa tietopohjaa.
3. Kun olet käynyt läpi olennaisimmat aiheet käyttäjän tilanteeseen ja käyttäjä vaikuttaa
   valmiilta, kerro että voit koota hänelle kirjallisen käynnistyssuunnitelman.

TÄRKEÄÄ:
- Vastaa aina suomeksi, selkeästi ja ilman turhaa byrokraattista kieltä.
- Tämä on yleistä opastusta, ei virallista vero- tai lakineuvontaa. Muistuta tarvittaessa,
  että yksityiskohdat kannattaa varmistaa tilitoimistolta tai verohallinnolta, erityisesti
  ALV:n ja YEL:n rajatapauksissa.
- Älä keksi lakeja, euromääriä tai rajoja joita et ole varma — kehota tarkistamaan
  ajantasainen tieto viranomaiselta, jos et ole varma.

TIETOPOHJA:
${STARTER_KNOWLEDGE_BASE}`;
}
