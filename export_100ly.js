/**
 * Export 100 LY star data for Project M
 * Outputs: data/stars_100ly.json  (full enriched data)
 *          data/stars_100ly.sql   (SQLite seed statements)
 *
 * Sources:
 *   - HYG Star Database v41 (CC BY-SA 4.0) by David Nash / astronexus.com
 *   - NASA Exoplanet Archive (public domain)
 */

const fs = require('fs');
const path = require('path');

const LY_PER_PC = 3.26156;
const MAX_LY = 100;
const MAX_PC = MAX_LY / LY_PER_PC;

// Load source data
const allStars = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/hygdata_1000ly_v5.json'), 'utf8'));
const allPlanets = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/planets.json'), 'utf8'));

// Build exoplanet lookup keyed by HIP number
const planetsByHip = {};
allPlanets.forEach(host => {
  if (host.hip) planetsByHip[host.hip] = host;
});

// Constellation abbreviation -> full name
const CONSTELLATIONS = {
  And:'Andromeda', Ant:'Antlia', Aps:'Apus', Aqr:'Aquarius', Aql:'Aquila',
  Ara:'Ara', Ari:'Aries', Aur:'Auriga', Boo:'Bootes', Cae:'Caelum',
  Cam:'Camelopardalis', Cnc:'Cancer', CVn:'Canes Venatici', CMa:'Canis Major',
  CMi:'Canis Minor', Cap:'Capricornus', Car:'Carina', Cas:'Cassiopeia',
  Cen:'Centaurus', Cep:'Cepheus', Cet:'Cetus', Cha:'Chamaeleon',
  Cir:'Circinus', Col:'Columba', Com:'Coma Berenices', CrA:'Corona Australis',
  CrB:'Corona Borealis', Crv:'Corvus', Crt:'Crater', Cru:'Crux',
  Cyg:'Cygnus', Del:'Delphinus', Dor:'Dorado', Dra:'Draco',
  Equ:'Equuleus', Eri:'Eridanus', For:'Fornax', Gem:'Gemini',
  Gru:'Grus', Her:'Hercules', Hor:'Horologium', Hya:'Hydra',
  Hyi:'Hydrus', Ind:'Indus', Lac:'Lacerta', Leo:'Leo',
  LMi:'Leo Minor', Lep:'Lepus', Lib:'Libra', Lup:'Lupus',
  Lyn:'Lynx', Lyr:'Lyra', Men:'Mensa', Mic:'Microscopium',
  Mon:'Monoceros', Mus:'Musca', Nor:'Norma', Oct:'Octans',
  Oph:'Ophiuchus', Ori:'Orion', Pav:'Pavo', Peg:'Pegasus',
  Per:'Perseus', Phe:'Phoenix', Pic:'Pictor', Psc:'Pisces',
  PsA:'Piscis Austrinus', Pup:'Puppis', Pyx:'Pyxis', Ret:'Reticulum',
  Sge:'Sagitta', Sgr:'Sagittarius', Sco:'Scorpius', Scl:'Sculptor',
  Sct:'Scutum', Ser:'Serpens', Sex:'Sextans', Tau:'Taurus',
  Tel:'Telescopium', Tri:'Triangulum', TrA:'Triangulum Australe',
  Tuc:'Tucana', UMa:'Ursa Major', UMi:'Ursa Minor', Vel:'Vela',
  Vir:'Virgo', Vol:'Volans', Vul:'Vulpecula'
};

// Spectral class -> colour hex and temperature band
const SPECTRAL_INFO = {
  O: { colour: '#9bb0ff', temp_k: 30000, description: 'Blue supergiant' },
  B: { colour: '#aabfff', temp_k: 20000, description: 'Blue-white' },
  A: { colour: '#cad7ff', temp_k: 8500,  description: 'White' },
  F: { colour: '#f8f7ff', temp_k: 6500,  description: 'Yellow-white' },
  G: { colour: '#fff4ea', temp_k: 5500,  description: 'Yellow (Sun-like)' },
  K: { colour: '#ffd2a1', temp_k: 4000,  description: 'Orange' },
  M: { colour: '#ffcc6f', temp_k: 3000,  description: 'Red dwarf' },
  D: { colour: '#a8c8ff', temp_k: 25000, description: 'White dwarf' },
  S: { colour: '#ff9966', temp_k: 3500,  description: 'Carbon-oxide giant' },
};

function planetType(r) {
  if (r == null) return 'unknown';
  if (r < 1.6)  return 'terrestrial';
  if (r < 3.5)  return 'super-earth';
  if (r < 6.0)  return 'neptune-like';
  return 'gas-giant';
}

function inHZ(sma_au, lum) {
  if (!sma_au || !lum) return null;
  const inner = 0.95 * Math.sqrt(lum);
  const outer = 1.37 * Math.sqrt(lum);
  return sma_au >= inner && sma_au <= outer;
}

// Filter and enrich stars
const stars = allStars
  .filter(s => s.dist > 0 && s.dist <= MAX_PC)
  .map(s => {
    const dist_ly = parseFloat((s.dist * LY_PER_PC).toFixed(2));
    const spectClass = s.spect ? s.spect[0].toUpperCase() : null;
    const spectInfo = SPECTRAL_INFO[spectClass] || null;

    // Display name: proper > bayer+con > HIP > HYG id
    let displayName;
    if (s.name) {
      displayName = s.name;
    } else if (s.bayer && s.con) {
      displayName = s.bayer + ' ' + s.con;
    } else if (s.hip) {
      displayName = 'HIP ' + s.hip;
    } else {
      displayName = 'HYG ' + s.id;
    }

    // Exoplanet data
    const planetHost = s.hip ? planetsByHip[s.hip] : null;
    let exoplanetData = null;
    if (planetHost) {
      const planets = planetHost.planets.map(p => ({
        name: p.name,
        type: planetType(p.radius_earth),
        radius_earth: p.radius_earth,
        mass_earth: p.mass_earth,
        period_days: p.period_days,
        sma_au: p.sma_au,
        eccentricity: p.eccentricity,
        temp_k: p.temp_k,
        in_hz: inHZ(p.sma_au, s.lum),
        detection_method: p.method,
        discovery_year: p.year,
      }));
      exoplanetData = {
        host_name: planetHost.hostname,
        planet_count: planets.length,
        has_terrestrial: planets.some(p => p.type === 'terrestrial'),
        has_hz_planet: planets.some(p => p.in_hz === true),
        planets,
      };
    }

    return {
      // Identity
      hyg_id: s.id,
      hip: s.hip || null,
      name: s.name || null,
      bayer: s.bayer || null,
      display_name: displayName,

      // Position in parsecs, Sol at origin
      x: s.x,
      y: s.y,
      z: s.z,
      dist_pc: parseFloat(s.dist.toFixed(4)),
      dist_ly,

      // Stellar properties
      magnitude: s.mag,
      abs_magnitude: s.absmag,
      luminosity: s.lum || null,
      spectral_type: s.spect || null,
      spectral_class: spectClass,
      colour_hex: spectInfo ? spectInfo.colour : null,
      temp_band_k: spectInfo ? spectInfo.temp_k : null,
      star_description: spectInfo ? spectInfo.description : null,

      // Sky location
      constellation_abbr: s.con || null,
      constellation_name: s.con ? (CONSTELLATIONS[s.con] || s.con) : null,

      // Binary
      is_binary: !!s.comp_primary,
      binary_companion_hyg_id: s.comp_primary || null,

      // Exoplanets
      has_exoplanets: !!exoplanetData,
      exoplanets: exoplanetData,
    };
  });

// Sort by distance from Sol
stars.sort((a, b) => a.dist_ly - b.dist_ly);

console.log('Extracted ' + stars.length + ' stars within ' + MAX_LY + ' LY');
console.log('  Named: ' + stars.filter(s => s.name).length);
console.log('  Bayer designation: ' + stars.filter(s => s.bayer).length);
console.log('  With exoplanets: ' + stars.filter(s => s.has_exoplanets).length);
console.log('  Binary systems: ' + stars.filter(s => s.is_binary).length);
console.log('  With HZ planets: ' + stars.filter(s => s.exoplanets && s.exoplanets.has_hz_planet).length);

// Write JSON
const jsonOut = path.join(__dirname, 'data/stars_100ly.json');
fs.writeFileSync(jsonOut, JSON.stringify(stars, null, 2));
console.log('\nWrote ' + jsonOut);

// Write SQL
const sqlLines = [];
sqlLines.push('-- Star catalogue seed data for Project M');
sqlLines.push('-- Source: HYG Star Database v41 (CC BY-SA 4.0) by David Nash / astronexus.com');
sqlLines.push('-- Exoplanet data: NASA Exoplanet Archive (public domain)');
sqlLines.push('-- Stars within 100 light years of Sol');
sqlLines.push('');
sqlLines.push('CREATE TABLE IF NOT EXISTS StarCatalogue (');
sqlLines.push('    HygId                TEXT PRIMARY KEY,');
sqlLines.push('    Hip                  TEXT,');
sqlLines.push('    Name                 TEXT,');
sqlLines.push('    Bayer                TEXT,');
sqlLines.push('    DisplayName          TEXT NOT NULL,');
sqlLines.push('    X                    REAL NOT NULL,');
sqlLines.push('    Y                    REAL NOT NULL,');
sqlLines.push('    Z                    REAL NOT NULL,');
sqlLines.push('    DistPc               REAL NOT NULL,');
sqlLines.push('    DistLy               REAL NOT NULL,');
sqlLines.push('    Magnitude            REAL,');
sqlLines.push('    AbsMagnitude         REAL,');
sqlLines.push('    Luminosity           REAL,');
sqlLines.push('    SpectralType         TEXT,');
sqlLines.push('    SpectralClass        TEXT,');
sqlLines.push('    ColourHex            TEXT,');
sqlLines.push('    TempBandK            INTEGER,');
sqlLines.push('    StarDescription      TEXT,');
sqlLines.push('    ConstellationAbbr    TEXT,');
sqlLines.push('    ConstellationName    TEXT,');
sqlLines.push('    IsBinary             INTEGER NOT NULL DEFAULT 0,');
sqlLines.push('    BinaryCompanionHygId TEXT,');
sqlLines.push('    HasExoplanets        INTEGER NOT NULL DEFAULT 0,');
sqlLines.push('    PlanetCount          INTEGER NOT NULL DEFAULT 0,');
sqlLines.push('    HasTerrestrial       INTEGER NOT NULL DEFAULT 0,');
sqlLines.push('    HasHzPlanet          INTEGER NOT NULL DEFAULT 0,');
sqlLines.push('    ExoplanetsJson       TEXT');
sqlLines.push(');');
sqlLines.push('');

function q(v) { return v == null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'"; }
function n(v) { return v == null ? 'NULL' : v; }
function b(v) { return v ? 1 : 0; }

sqlLines.push('INSERT OR REPLACE INTO StarCatalogue VALUES');
stars.forEach((s, i) => {
  const exoJson = s.exoplanets ? q(JSON.stringify(s.exoplanets)) : 'NULL';
  const planetCount = s.exoplanets ? s.exoplanets.planet_count : 0;
  const row = '  (' +
    q(s.hyg_id) + ',' + q(s.hip) + ',' + q(s.name) + ',' + q(s.bayer) + ',' + q(s.display_name) + ',' +
    n(s.x) + ',' + n(s.y) + ',' + n(s.z) + ',' + n(s.dist_pc) + ',' + n(s.dist_ly) + ',' +
    n(s.magnitude) + ',' + n(s.abs_magnitude) + ',' + n(s.luminosity) + ',' +
    q(s.spectral_type) + ',' + q(s.spectral_class) + ',' + q(s.colour_hex) + ',' +
    n(s.temp_band_k) + ',' + q(s.star_description) + ',' +
    q(s.constellation_abbr) + ',' + q(s.constellation_name) + ',' +
    b(s.is_binary) + ',' + q(s.binary_companion_hyg_id) + ',' +
    b(s.has_exoplanets) + ',' + n(planetCount) + ',' +
    b(s.exoplanets && s.exoplanets.has_terrestrial) + ',' +
    b(s.exoplanets && s.exoplanets.has_hz_planet) + ',' +
    exoJson + ')' + (i < stars.length - 1 ? ',' : ';');
  sqlLines.push(row);
});

const sqlOut = path.join(__dirname, 'data/stars_100ly.sql');
fs.writeFileSync(sqlOut, sqlLines.join('\n'));
console.log('Wrote ' + sqlOut);

// Summary
const byClass = {};
stars.forEach(s => { const c = s.spectral_class || '?'; byClass[c] = (byClass[c] || 0) + 1; });
console.log('\nSpectral class breakdown:', byClass);
console.log('\nNearest 10 stars:');
stars.slice(0, 10).forEach(s =>
  console.log('  ' + s.dist_ly.toFixed(2) + ' LY  ' + s.display_name + '  (' + (s.spectral_type || '?') + ')')
);
console.log('\nSol (origin) is not in the HYG data as a distant star - add manually if needed.');
