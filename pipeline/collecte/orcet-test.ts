// Orcet sur un amendement donné (50 crédits). Usage : bun orcet-test.ts <amendement_id>
import { api, compteur } from "./lib/hemicycle";
const r = await api("POST", "/orcet/predictions", { amendement: process.argv[2] });
console.log(r.status, r.cost, JSON.stringify(r.json), JSON.stringify(compteur));
