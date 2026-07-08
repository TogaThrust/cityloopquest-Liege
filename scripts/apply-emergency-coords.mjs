#!/usr/bin/env node
/**
 * Met à jour data/emergency_contacts.city.json — coords utilisateur + suppressions ENLEVER.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, "../data/emergency_contacts.city.json");

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clé de correspondance : adresse normalisée (sans code postal optionnel). */
function addrKey(address) {
  return norm(address).replace(/,?\s*\d{4}(\s+\w+)?$/i, "").trim();
}

const REMOVE_KEYS = new Set(
  [
    "avenue georges truffaut 21",
    "rue vaudree 23",
    "place des beguinages 3",
    "rue ernest solvay 27",
    "boulevard de la sauveniere 2",
    "rue burenville 23",
    "rue douffet 98",
    "rue de la station 63",
    "place delcour 22",
    "avenue de la croix-rouge 116",
    "place sainte-veronique 14",
    "rue de l'academie 73",
    "place saint-pholien 17",
    "boulevard de la constitution 67",
    "rue du pont 13",
    "boulevard de laveleye 37",
    "rue chafnay 3",
    "rue de bois-de-breux 282",
    "place du vingt aout 1",
    "rue puits-en-sock 80",
    "rue saint-leonard 234",
    "boulevard e. solvay 248",
    "rue joffre 1",
    "rue saint-paul 1-3",
    "en feronstrée 14",
    "place du marche 36",
    "rue saint-leonard 279",
  ].map(norm)
);

/** Mises à jour par clé adresse (partie rue, insensible casse/accents). */
const COORDS_BY_ADDR = new Map(
  Object.entries({
    "boulevard du 12e de ligne 1": [50.651950939648124, 5.5769286300873375],
    "rue de gaillarmont 600": [50.62252208776866, 5.6369764648746665],
    "avenue de l'hopital 1": [50.57326415514167, 5.567577550634866],
    "boulevard de patience et beaujonc 2": [50.64929803690523, 5.5356908435791485],
    "rue basse-wez 145": [50.63402146520747, 5.589153149511487],
    "290 rue saint-nicolas": [50.63890264799933, 5.542584545271225],
    "rue soeurs-de-hasque 15": [50.640246519478076, 5.573016595852616],
    "468 rue de campine": [50.65520647340756, 5.57108609384368],
    "49 quai de la boverie": [50.63315477802981, 5.576831718632874],
    "boulevard de colonster 20": [50.57750012712951, 5.578303950054895],
    "avenue du luxembourg 33": [50.62256491539294, 5.585389748959401],
    "rue saint-gilles 54": [50.639265608464186, 5.566214193730345],
    "rue de fleron 280/2": [50.636280846824015, 5.658176276702002],
    "rue de vise 389": [50.659066653835126, 5.652243848900244],
    "rue vaudree 192": [50.61350447144443, 5.590325511606057],
    "rue saint-nicolas 524": [50.640543154120614, 5.535493411266074],
    "rue belvaux 105": [50.62184615793449, 5.599573790143261],
    "avenue de juprelle 2": [50.68097578500443, 5.552396937876549],
    "avenue de la rousseliere 2": [50.63097899003739, 5.645650435607016],
    "rue du moulin 16": [50.641402056183175, 5.598065397051119],
    "rue du moulin 101": [50.64139858105865, 5.59806595223608],
    "rue belvaux 20": [50.6193849414181, 5.60318825540467],
    "rue carpay 20/0001": [50.646176792470875, 5.60238151605721],
    "rue des carmes 36-38": [50.63958678639868, 5.573369875022455],
    "place du general-leman 29": [50.62053555608302, 5.5740355335162395],
    "rue emile-vandervelde 163": [50.645563289320215, 5.5400922598096765],
    "boulevard kleyer 134": [50.6255669993538, 5.550517682227379],
    "rue neuve 10": [50.61260119988398, 5.6144432263439095],
    "rue renory 78": [50.613128045908724, 5.578619605053859],
    "rue pont saint-nicolas 2": [50.64122246596126, 5.581688825372274],
    "rue saint gilles 584": [50.6328010700014, 5.547421873154684],
    "rue de la revision 104": [50.607593153091834, 5.6236660915827255],
    "boulevard frankignoul 3/a": [50.627943547965415, 5.587700641131534],
    "rue pont d'avroy 15": [50.64063899941105, 5.570326181921223],
    "rue jean de wilde 4": [50.65937958145679, 5.567135850322617],
    "place saint lambert 5": [50.64477275485302, 5.5742727739443545],
    "rue ernest solvay 227": [50.60925435863251, 5.555884112263781],
    "rue bassenge 39": [50.6351467420992, 5.55978177777713],
    "rue basse-wez 315": [50.6322793739852, 5.58819170568778],
    "avenue henri-piedboeuf 12": [50.613342384134484, 5.585738420125131],
    "rue nicolas spiroux 221": [50.62504133668485, 5.616726867941041],
    "rue lairesse 15": [50.636029917425326, 5.586843254958961],
    "rue sainte-marguerite 90": [50.64562186194632, 5.560330918107993],
    "rue du laveu 57": [50.631821736661706, 5.557959418113766],
    "place henri simon 18": [50.6284263537324, 5.553215485940284],
    "place andrea jadoulle 6/8": [50.611201352061855, 5.599335723309509],
    "rue saint-laurent 254": [50.63741094799467, 5.554332712285152],
    "rue du laveu 7": [50.63182022137063, 5.5579618147194125],
    "rue haute-wez 135": [50.62644547183263, 5.590480642993755],
    "rue saint-leonard 518": [50.65384522785762, 5.604662399322336],
    "rue hippolyte cornet 4": [50.61141510276587, 5.619568059666238],
    "rue de vise 26": [50.644570104240174, 5.624020565647231],
    "rue du pont de wandre 58": [50.67014056915061, 5.65881589102846],
    "quai de rome 49/c": [50.62291019015675, 5.576538659368798],
    "rue de hesbaye 99": [50.648689745011154, 5.55388680688388],
    "place reine-astrid 2": [50.675833716542904, 5.54621613847293],
    "rue sainte-walburge 11": [50.65485031486649, 5.572941195942117],
    "rue de herve 458": [50.627253685660605, 5.632856491892661],
    "boulevard raymond poincare 7/11": [50.63521443925448, 5.580792956985727],
    "rue saint-gilles 469": [50.63250914904823, 5.547044630922627],
    "rue cathedrale 102": [50.64156935386292, 5.572223905541388],
    "rue des maraichers 90": [50.63889041962711, 5.594618299682371],
    "rue dartois 41": [50.62768215101821, 5.566746465587755],
    "rue saint-gilles 278": [50.636855537434315, 5.560279677447989],
    "place des guillemins 2": [50.62438710085014, 5.566844950168531],
    "avenue de l'observatoire 341": [50.62000368681329, 5.565064096321695],
    "rue du parc 5": [50.63197165941556, 5.574976059764104],
    "avenue du luxembourg 92": [50.62229059561424, 5.5900227986976025],
    "rue du centenaire 21": [50.62012052943297, 5.618935340460532],
    "rue du perron 147": [50.61986449704821, 5.5571274603801735],
    "jonruelle 62": [50.65074415856902, 5.5883747117742955],
    "avenue de l'hopital 1/35": [50.573141152656106, 5.567447076242469],
    "route de herve 483": [50.628781600827665, 5.621492936499785],
    "route du condroz 473": [50.59323226148044, 5.573401634340149],
    "rue fraischamps 162": [50.629802599726375, 5.6056699689417835],
    "rue saint-laurent 160": [50.64053195871718, 5.557488755683631],
    "boulevard du 12ieme de ligne 1": [50.65470063956567, 5.573410612286881],
    "rue leopold 20": [50.64443884717679, 5.575847365062487],
    "avenue cardinal mercier 4": [50.63667954008453, 5.602834670625961],
    "rue molinvaux 136": [50.65322985302919, 5.553647141132532],
    "rue jean-hermesse 45/01": [50.64273974801137, 5.634828823414281],
    "place xavier neujean 13/e": [50.6428826507554, 5.568591155532952],
    "rue neuve 9": [50.61271158403069, 5.614317720468257],
    "rue st leonard 3": [50.64816577202026, 5.586357058919864],
    "rue de fetinne 92": [50.62486505765219, 5.582660455452201],
    "rue de l'universite 8": [50.64278859047088, 5.572644417778403],
    "avenue reine elisabeth 13": [50.621830008944706, 5.588402619961073],
    "rue de beaufraipont 33b": [50.60726351648615, 5.613465386145418],
    "quai des vennes 1/103": [50.615647756136944, 5.593633474236866],
    "chaussee de tongres 255": [50.66967474081257, 5.550259978995492],
    "rue d'amercoeur 15": [50.6376977042995, 5.588570038444008],
    "boulevard d'avroy 136": [50.63478668774383, 5.567314035097163],
    "rue des bonnes villes 9": [50.64296686932366, 5.589860054022211],
    "rue du limbourg 2": [50.65563364609451, 5.565412008737025],
    "avenue cardinal mercier 3": [50.6370790502701, 5.602625141120291],
    "place des franchises 3": [50.62388614345826, 5.570910212685067],
    "boulevard des hauteurs 15": [50.65644464457214, 5.56295899645911],
    "rue de herve 507": [50.62857015664491, 5.622907530069581],
    "rue louvrex 56": [50.63374953526164, 5.564182882702651],
    "rue du haut pave 3": [50.662984654303884, 5.595413646999089],
    "rue froidart 50": [50.64353583897212, 5.597585243574759],
    "rue des guillemins 12": [50.62682174969728, 5.572546704351674],
    "rue fraischamps 24": [50.62747724858992, 5.599838645600837],
    "rue sainte marguerite 279": [50.64740008369615, 5.553947007493071],
    "avenue de l'agriculture 66": [50.62818192489865, 5.60828249710266],
    "rue de tilff 45": [50.6098254418393, 5.601310997285501],
    "rue renory 44": [50.61396542690665, 5.579262303170197],
    "chaussee de tongres 41": [50.66511224943695, 5.560036821001488],
    "rue saint-nicolas 305": [50.63900835227363, 5.539901823330605],
    "avenue blonden 38": [50.62912926250548, 5.5698185546408405],
    "rue de fragnee 4": [50.62682287046734, 5.572536280233337],
    "avenue maurice destenay 16": [50.63840145563162, 5.569123958912456],
    "rue eugene-houdret 57": [50.64965404168385, 5.548095083781859],
  }).map(([k, v]) => [norm(k), v])
);

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const facilities = data.cities.liege.facilities;
const before = facilities.length;

const kept = [];
let removed = 0;
let updated = 0;
let unmatched = [];

for (const f of facilities) {
  const key = addrKey(f.address);
  if (REMOVE_KEYS.has(key)) {
    removed++;
    continue;
  }
  const coords = COORDS_BY_ADDR.get(key);
  if (coords) {
    f.lat = coords[0];
    f.lng = coords[1];
    updated++;
  } else if (f.category !== "pharmacy" || f.lat == null) {
    unmatched.push(`${f.category}: ${f.name} — ${f.address}`);
  }
  kept.push(f);
}

data.cities.liege.facilities = kept;
data.meta.updatedAt = new Date().toISOString().slice(0, 10);

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");

const counts = { hospital: 0, pharmacy: 0, veterinary: 0 };
for (const f of kept) counts[f.category] = (counts[f.category] || 0) + 1;

console.log(`Facilities: ${before} → ${kept.length} (−${removed} supprimés, ${updated} coords mises à jour)`);
console.log(`Reste: ${counts.hospital} hôpitaux, ${counts.pharmacy} pharmacies, ${counts.veterinary} vétérinaires`);
if (unmatched.length) {
  console.log("\nSans coords explicites:");
  unmatched.forEach((l) => console.log("  ", l));
}
