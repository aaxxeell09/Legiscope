import { describe, expect, test } from "bun:test";
import { verifierChiffres } from "./verif";

describe("verifierChiffres (règle 5.13)", () => {
  test("nombre absent de la liste : rejet avec le jeton fautif", () => {
    const r = verifierChiffres("Le groupe compte 123 députés et 4 commissions.", ["123"]);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["4"]);
  });

  test("« 71 % » accepté quand la probabilité 0.71 est autorisée", () => {
    const r = verifierChiffres("Orcet prédit 71 % de votes pour, soit 0,71.", ["0.71"]);
    expect(r.ok).toBe(true);
    expect(r.fautifs).toEqual([]);
  });

  test("date : « le 3 novembre 2026 » couverte par la date ISO 2026-11-03", () => {
    const r = verifierChiffres("Il l'a dit le 3 novembre 2026 en séance, le 11 du mois suivant aussi.", ["2026-11-03"]);
    expect(r.ok).toBe(true);
  });

  test("année : 2024 à 2027 toujours permises, 2019 rejetée", () => {
    expect(verifierChiffres("Depuis 2024 et jusqu'en 2027.", []).ok).toBe(true);
    const r = verifierChiffres("La loi de 2019 est abrogée.", []);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["2019"]);
  });

  test("ordinal : « 1er », « 2e », « 3ème » comparés sur la partie numérique", () => {
    expect(verifierChiffres("Le 1er alinéa, la 2e lecture et le 3ème rang.", ["1", "2", "3"]).ok).toBe(true);
    const r = verifierChiffres("Au 5ème rang.", ["3"]);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["5ème"]);
  });

  test("« trois » en lettres : rejeté sauf si 3 est autorisé ; « un » toléré", () => {
    const r = verifierChiffres("Trois groupes et un seul amendement.", []);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["Trois"]);
    expect(verifierChiffres("Trois groupes et un seul amendement.", ["3"]).ok).toBe(true);
  });

  test("« n° 3426 » : accepté si le numéro est autorisé, rejeté sinon", () => {
    expect(verifierChiffres("Il a cosigné l'amendement n° 3426.", ["3426"]).ok).toBe(true);
    const r = verifierChiffres("Il a cosigné l'amendement n° 3426.", ["3427"]);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["3426"]);
  });

  test("espace fine : « 1 200 » (U+202F) et « 1 200 » (insécable) valent 1200", () => {
    expect(verifierChiffres("Soit 1 200 entreprises.", ["1200"]).ok).toBe(true);
    expect(verifierChiffres("Soit 1 200 entreprises.", ["1200"]).ok).toBe(true);
    const r = verifierChiffres("Soit 1 200 entreprises.", ["1000"]);
    expect(r.ok).toBe(false);
    expect(r.fautifs).toEqual(["1200"]);
  });

  test("mots contenant un nombre (septembre, dixième, sixte) ne sont pas des nombres", () => {
    expect(verifierChiffres("En septembre, le dixième rapport.", []).ok).toBe(true);
  });

  test("identifiants et numéros collés à des lettres ne sont pas extraits", () => {
    expect(verifierChiffres("Texte PRJLANR5L17B3210, scrutin VTANR5L17V1234.", []).ok).toBe(true);
  });
});
