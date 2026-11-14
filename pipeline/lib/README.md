# pipeline/lib : rédaction vérifiée (P8)

Signatures figées à 13 h 35. Importer depuis `pipeline/lib/llm.ts` et `pipeline/lib/verif.ts`.

## `redigerVerifie(prompt, chiffresAutorises, gabarit): Promise<Redaction>`

```ts
import { redigerVerifie } from "../lib/llm";
const r = await redigerVerifie(
  { system: "…", user: "…" },          // ou une chaîne (le user seul)
  ["806", "0.24", "2025-11-19"],        // chaînes : nombres, probabilités, dates ISO
  "Texte de secours déjà rempli",       // ou () => string
);
// r = { texte, mode: "llm" | "gabarit", chiffres_utilises: string[], fautifs: string[],
//       modele: string | null, verifie: boolean, tentatives: number }
```

- 3 tentatives du modèle ; chaque sortie passe `verifierChiffres` ; les jetons fautifs sont renvoyés au modèle.
- Échec, clé absente ou réseau en panne : le gabarit est rendu, `mode: "gabarit"`, `modele: null`. **Ne lève jamais.**
- `chiffres_utilises` = les entrées de la liste présentes dans le texte : à recopier telles quelles dans le JSON (`lecture`, `contre_arguments`, `note`).
- `verifie` = le texte rendu passe le vérificateur (en gabarit aussi : écrivez un gabarit sans nombre hors liste).
- Liste autorisée : une probabilité `0.71` autorise « 71 % » ; une date `2025-11-19` autorise 19, 11 et 2025 ; les années 2024 à 2027 sont toujours permises. Ne mettez jamais un vote brut dans le prompt (règle 5.13).
- Correspondance avec les contrats : `{texte, mode, modele, verifie, chiffres_utilises}` = `LectureSchema` (verdict) ; `ContreArgumentSchema` prend `{texte, mode, verifie, chiffres_utilises}`.

## `appelStructure<T>(system, user, schemaZod): Promise<T>`

```ts
import { appelStructure, LLMIndisponible } from "../lib/llm";
const S = z.object({ position: z.enum(["pour", "contre", "inconnue"]), citation: z.string().nullable() });
try { const o = await appelStructure("…", "…", S); } catch (e) { if (e instanceof LLMIndisponible) /* repli */ }
```

- Le schéma zod est passé comme unique outil `repondre` (`tool_choice` forcé) ; l'objet est validé par zod ; 2 tentatives.
- **Lève `LLMIndisponible`** (clé absente, réseau, sortie invalide) : prévoyez un repli.
- Schémas supportés : object, string, number, boolean, array, enum, literal, nullable, optional, union, record.

## Autres exports

- `cleDisponible(): boolean` : `FEATHERLESS_API_KEY` présente.
- `coutCumule(): {appels, entree, sortie, dollars}` : coût du processus (0,4 $ / 3 $ par million de jetons).
- `MODELE` : `Qwen/Qwen3.8-27B` (surchargeable par `FEATHERLESS_MODEL`).
- `verifierChiffres(texte, autorises): {ok, fautifs}` dans `verif.ts` (règle 5.13 en 5 points).

## Réglages

- Concurrence : 2 appels simultanés au plus par processus (file d'attente interne). 429 et 5xx : 4 essais avec attente.
- Température 0,2. Thinking désactivé par `chat_template_kwargs: {enable_thinking: false}` ; `FEATHERLESS_THINKING=effort` bascule sur `reasoning_effort: "low"`, `aucun` n'envoie rien.
- Test de fumée réel : `bun pipeline/lib/fumee.ts` (écrit le résultat et le coût sur la sortie).
- Tests hors réseau : `bun test pipeline/lib`.
