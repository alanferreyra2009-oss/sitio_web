/* =========================================================================
   Pokepedia — Núcleo: configuración, tipos, traducciones y utilidades
   ========================================================================= */
var PW = window.PW = window.PW || {};

PW.config = {
    API: 'https://pokeapi.co/api/v2/',
    SPRITE: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
    ART: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',
    ITEMS_SPRITE: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/',
    /* CDN alternativo de sprites (pokemon.com) usado como respaldo de imágenes */
    POKE_CDN: 'https://assets.pokemon.com/assets/cms2/img/pokedex/detail/',
    DEX_BATCH: 60,
    MAX_TEAM: 6,
    EXTRA_PREFIX: 'pw_extra_',
    /* Mapas de las regiones (Wikimedia Commons salvo Galar, de Pokémon Wiki) */
    REGION_MAPS: {
        Kanto:   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kanto_Map.png/960px-Kanto_Map.png',
        Johto:   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Johto_Map.png/960px-Johto_Map.png',
        Hoenn:   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Hoenn_Map.png/960px-Hoenn_Map.png',
        Sinnoh:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Sinnoh_Map.png/960px-Sinnoh_Map.png',
        Teselia: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Unova_Map.png/960px-Unova_Map.png',
        Kalos:   'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Kalos_Map.png/960px-Kalos_Map.png',
        Alola:   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Alola_Map.png/960px-Alola_Map.png',
        Galar:   'https://static.wikia.nocookie.net/pokemon/images/a/a4/Galar_map.png/revision/latest/scale-to-width-down/900?cb=20221129115726',
        Paldea:  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Paldea_Map.png/960px-Paldea_Map.png'
    }
};

PW.regions = [
    { name: 'Kanto',   gen: 'I',   start: 1,    end: 151,  api: 'kanto' },
    { name: 'Johto',   gen: 'II',  start: 152,  end: 251,  api: 'johto' },
    { name: 'Hoenn',   gen: 'III', start: 252,  end: 386,  api: 'hoenn' },
    { name: 'Sinnoh',  gen: 'IV',  start: 387,  end: 493,  api: 'sinnoh' },
    { name: 'Teselia', gen: 'V',   start: 494,  end: 649,  api: 'unova' },
    { name: 'Kalos',   gen: 'VI',  start: 650,  end: 721,  api: 'kalos' },
    { name: 'Alola',   gen: 'VII', start: 722,  end: 809,  api: 'alola' },
    { name: 'Galar',   gen: 'VIII',start: 810,  end: 905,  api: 'galar' },
    { name: 'Paldea',  gen: 'IX',  start: 906,  end: 1025, api: 'paldea' }
];

PW.regionByApi = {};
PW.regions.forEach(function (r, i) { PW.regionByApi[r.api] = i; });

/* Región ficticia "Todas las regiones" para el filtro de la Pokédex */
PW.regionsAll = { name: 'Nacional', gen: 'I–IX', start: 1, end: 1025, api: '__all', isAll: true };

/* Estado global compartido entre vistas (definido aquí para que esté
   disponible al cargar cualquier módulo, independientemente del orden) */
PW.state = {
    all: [],
    dex: {
        region: PW.regions[0],
        q: '',
        type1: '',
        type2: '',
        ability: '',
        egg: '',
        hidden: false,
        legendary: false,
        mythical: false,
        starter: false,
        fossil: false,
        evo: '',
        tmin: '',
        tmax: '',
        sort: 'num',
        dir: 'asc',
        view: 'grid',
        renderedCount: 0,
        extra: null
    },
    team: { ids: [], name: '' },
    compare: { ids: [] }
};

PW.types = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

PW.typeColors = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD'
};

PW.typeEs = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
    grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
    ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
    rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
    steel: 'Acero', fairy: 'Hada'
};

PW.statEs = {
    hp: 'PS', attack: 'Ataque', defense: 'Defensa',
    'special-attack': 'Ataq. Esp.', 'special-defense': 'Def. Esp.', speed: 'Velocidad'
};

PW.categoryEs = { physical: 'Físico', special: 'Especial', status: 'Estado' };

PW.generationRoman = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
};

/* Tabla de efectividad de tipos (Gen 6+, incluye Hada). Uso: chart[atacante][defensor] */
PW.typeChart = {
    normal:   { rock: .5, ghost: 0, steel: .5 },
    fire:     { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
    water:    { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
    electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
    grass:    { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
    ice:      { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
    fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
    poison:   { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
    flying:   { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
    psychic:  { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
    bug:      { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
    rock:     { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: .5 },
    dragon:   { dragon: 2, steel: .5, fairy: 0 },
    dark:     { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
    steel:    { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
    fairy:    { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 }
};

/* Datos canónicos que la PokéAPI no expone (líneas iniciales y fósiles por generación) */
PW.curated = {
    starters: [
        1, 2, 3, 4, 5, 6, 7, 8, 9,                          /* Kanto   */
        152, 153, 154, 155, 156, 157, 158, 159, 160,        /* Johto   */
        252, 253, 254, 255, 256, 257, 258, 259, 260,        /* Hoenn   */
        387, 388, 389, 390, 391, 392, 393, 394, 395,        /* Sinnoh  */
        495, 496, 497, 498, 499, 500, 501, 502, 503,        /* Unova   */
        650, 651, 652, 653, 654, 655, 656, 657, 658,        /* Kalos   */
        722, 723, 724, 725, 726, 727, 728, 729, 730,        /* Alola   */
        810, 811, 812, 813, 814, 815, 816, 817, 818,        /* Galar   */
        906, 907, 908, 909, 910, 911, 912, 913, 914         /* Paldea  */
    ],
    fossils: [
        138, 139, 140, 141, 142,                            /* Kanto   */
        345, 346, 347, 348,                                 /* Hoenn   */
        408, 409, 410, 411,                                 /* Sinnoh  */
        564, 565, 566, 567,                                 /* Unova   */
        696, 697, 698, 699,                                 /* Kalos   */
        880, 881, 882, 883                                  /* Galar   */
    ]
};

/* -------------------------------------------------------------------------
   Traducciones curadas (la PokéAPI no ofrece nombre en español para estos
   recursos fijos, así que se mapean manualmente)
   ------------------------------------------------------------------------- */
PW.dicts = {
    eggGroups: {
        monster: 'Monstruo', water1: 'Agua 1', bug: 'Bicho', flying: 'Volador',
        field: 'Campo', fairy: 'Hada', grass: 'Planta', 'human-like': 'Humanoide',
        water3: 'Agua 3', mineral: 'Mineral', amorphous: 'Amorfo', water2: 'Agua 2',
        ditto: 'Ditto', dragon: 'Dragón', undiscovered: 'Sin descubrir'
    },
    moveTargets: {
        'specific-move': 'Un movimiento específico',
        'selected-pokemon-me-first': 'El objetivo (Me First)',
        ally: 'El aliado', 'users-field': 'El campo del usuario',
        'user-or-ally': 'El usuario o un aliado', 'opponents-field': 'El campo del rival',
        user: 'El usuario', 'random-opponent': 'Un rival al azar',
        'all-other-pokemon': 'Todos los demás Pokémon', 'selected-pokemon': 'Un Pokémon seleccionado',
        'all-opponents': 'Todos los rivales', 'entire-field': 'Todo el campo',
        'user-and-allies': 'El usuario y sus aliados', 'all-pokemon': 'Todos los Pokémon',
        'all-allies': 'Todos los aliados', 'fainting-pokemon': 'El Pokémon debilitado',
        'selected-pokemon-whole-field': 'El Pokémon seleccionado (todo el campo)'
    },
    firmness: {
        'very-soft': 'Muy blanda', soft: 'Blanda', hard: 'Dura',
        'very-hard': 'Muy dura', 'super-hard': 'Super dura'
    },
    encounterMethods: {
        walk: 'Caminando', 'old-rod': 'Caña vieja', 'good-rod': 'Caña buena',
        'super-rod': 'Caña super', surf: 'Surfeando', 'rock-smash': 'Golpe roca',
        headbutt: 'Golpe cabeza', 'dark-grass': 'Hierba oscura',
        'grass-spots': 'Manchas de hierba', 'cave-spots': 'Manchas en cuevas',
        'bridge-spots': 'Manchas en puentes', 'super-rod-spots': 'Manchas de caña super',
        'surf-spots': 'Manchas en el agua', 'yellow-flowers': 'Flores amarillas',
        'purple-flowers': 'Flores púrpuras', 'red-flowers': 'Flores rojas',
        'rough-terrain': 'Terreno irregular', gift: 'Regalo', 'gift-egg': 'Huevo de regalo',
        static: 'Encuentro fijo', pokeflute: 'Con la flauta',
        'headbutt-low': 'Golpe cabeza (bajo)', 'headbutt-normal': 'Golpe cabeza (normal)',
        'headbutt-high': 'Golpe cabeza (alto)', 'squirt-bottle': 'Con el rociador',
        'wailmer-pail': 'Con la regadera', seaweed: 'Entre las algas',
        'roaming-grass': 'Errante en hierba', 'roaming-water': 'Errante en agua',
        'devon-scope': 'Con el visor Devon', 'feebas-tile-fishing': 'Pesca de Feebas',
        'island-scan': 'Exploración de isla', sos: 'Cadena SOS',
        'bubbling-spots': 'Burbujas en el agua', 'berry-trees': 'Árboles de bayas',
        'npc-trade': 'Intercambio con un NPC', 'sos-from-bubbling-spot': 'SOS en burbujas',
        overworld: 'En el mundo', 'overworld-water': 'En el agua (mundo)',
        'overworld-flying': 'Volando', 'overworld-special': 'Encuentro especial en el mundo',
        'overworld-flying-special': 'Volando (especial)', 'overworld-water-special': 'En el agua (especial)',
        horde: 'Horda', 'colosseum-bonus-disc-us': 'Disco bono Colosseum (EE. UU.)',
        'colosseum-bonus-disc-jpn': 'Disco bono Colosseum (Japón)',
        'pokemon-channel-pal': 'Pokémon Channel (PAL)', 'pokemon-ranger': 'Pokémon Ranger',
        'pokemon-battle-revolution': 'Pokémon Battle Revolution',
        'new-york-pokecenter-wish-eggs': 'Huevos Wish (Centro Pokémon de Nueva York)',
        snag: 'Robo (Colosseum)', 'snag-rematch': 'Robo (rev. Colosseum)',
        pokespot: 'Pokéspot', 'hidden-grotto': 'Cuevas ocultas', 'honey-tree': 'Árbol de miel',
        'overworld-dirt': 'Suelo (mundo)', wanderer: 'Errante',
        'wanderer-water': 'Errante en el agua', 'chase-water': 'Persecución en el agua',
        'dynamax-adventure': 'Aventura Dynamax', 'max-raid': 'Incurisión Dynamax',
        'trash-can-ambush': 'Emboscada en papelera', 'rustling-bush-ambush': 'Emboscada en arbusto',
        'ceiling-ambush': 'Emboscada en el techo', 'ground-ambush': 'Emboscada en el suelo',
        'sky-ambush': 'Emboscada en el cielo'
    },
    itemCategories: {
        medicine: 'Medicina', pokeballs: 'Poké Balls', 'standard-balls': 'Poké Balls estándar',
        'special-balls': 'Poké Balls especiales', 'apricorn-balls': 'Poké Balls bonga',
        healing: 'Curación', 'status-cures': 'Cura de estados', revival: 'Revitalizantes',
        vitamins: 'Vitaminas', 'type-enhancement': 'Potenciadores de tipo',
        'held-items': 'Objetos para llevar', choice: 'Elección',
        'effort-training': 'Entrenamiento de esfuerzo', 'bad-held-items': 'Objetos malos para llevar',
        training: 'Entrenamiento', plates: 'Placas', 'species-specific': 'Específicos de especie',
        'type-protection': 'Protección contra tipos', evolution: 'Evolución', loot: 'Botín',
        mulch: 'Acodo', shards: 'Fragmentos', berries: 'Bayas', apricorn: 'Bongas',
        flutes: 'Flautas', 'mega-stones': 'Megapiedras', 'z-crystals': 'Cristales Z',
        'tera-shard': 'Fragmentos Tera', 'curry-ingredients': 'Ingredientes de curry',
        'sandwich-ingredients': 'Ingredientes de sándwich', 'picnic-ingredients': 'Ingredientes de picnic',
        'memory-drive': 'Memorias',
        'in-battle-effect': 'Efecto en combate', 'consumables': 'Consumibles',
        'collectibles': 'Coleccionables', 'tms': 'MTs', 'machines': 'Máquinas',
        'technical-machines': 'Máquinas técnicas', 'unused': 'Sin uso',
        'baking-only': 'Solo para repostería', 'stat-boosts': 'Aumentos de estadísticas',
        'other': 'Otros', 'all-mail': 'Cartas', 'grammar': 'Gramática',
        'natural-gifts': 'Regalos naturales'
    },
    versionGroups: {
        'red-blue': 'Rojo y Azul', yellow: 'Amarillo', 'gold-silver': 'Oro y Plata',
        crystal: 'Cristal', 'ruby-sapphire': 'Rubí y Zafiro', emerald: 'Esmeralda',
        'fire-red-leaf-green': 'Rojo Fuego y Verde Hoja', 'diamond-pearl': 'Diamante y Perla',
        platinum: 'Platino', 'heartgold-soulsilver': 'Oro HeartGold y Plata SoulSilver',
        'black-white': 'Negro y Blanco', 'black-2-white-2': 'Negro 2 y Blanco 2',
        'x-y': 'X y Y', 'omega-ruby-alpha-sapphire': 'Rubí Omega y Zafiro Alfa',
        'sun-moon': 'Sol y Luna', 'ultra-sun-ultra-moon': 'Ultrasol y Ultraluna',
        'lets-go-pikachu-lets-go-eevee': "Let's Go, Pikachu! y Let's Go, Eevee!",
        'sword-shield': 'Espada y Escudo', 'brilliant-diamond-shining-pearl': 'Diamante Brillante y Perla Reluciente',
        'legends-arceus': 'Leyendas: Arceus', 'scarlet-violet': 'Escarlata y Púrpura'
    },
    evoTriggers: {
        'level-up': 'Subiendo de nivel', trade: 'Intercambio', 'use-item': 'Usando objeto',
        shed: 'Nincada + espacio en el equipo', spin: 'Girando',
        'tower-of-darkness': 'Torre de la Oscuridad', 'tower-of-water': 'Torre del Agua',
        'three-critical-hits': 'Tras 3 golpes críticos', 'take-damage': 'Al recibir daño',
        other: 'Evolución especial', 'agile-style': 'Estilo ágil', 'strong-style': 'Estilo fuerte',
        'recoil-damage': 'Por daño de retroceso'
    },
    pokedexes: {
        national: 'Nacional', kanto: 'Kanto', 'original-johto': 'Johto original',
        hoenn: 'Hoenn', 'original-sinnoh': 'Sinnoh original', 'extended-sinnoh': 'Sinnoh ampliada',
        'updated-sinnoh': 'Sinnoh actualizada', 'original-unova': 'Teselia original',
        'updated-unova': 'Teselia actualizada', 'kalos-central': 'Kalos central',
        'kalos-coastal': 'Kalos costera', 'kalos-mountain': 'Kalos montaña',
        alola: 'Alola', 'updated-alola': 'Alola actualizada', 'original-alola': 'Alola original',
        galar: 'Galar', 'isle-of-armor': 'Isla de la Armadura', 'crown-tundra': 'Tundra Corona',
        hisui: 'Hisui', paldea: 'Paldea', kitakami: 'Kitakami', blueberry: 'Arándano',
        'original-paldea': 'Paldea original',
        johto: 'Johto', sinnoh: 'Sinnoh', unova: 'Teselia', kalos: 'Kalos', teselia: 'Teselia'
    },
    /* Nombres en español de ciudades, pueblos y zonas notables */
    towns: {
        'pallet-town': 'Pueblo Paleta', 'viridian-city': 'Ciudad Verde', 'pewter-city': 'Ciudad Plateada',
        'cerulean-city': 'Ciudad Celeste', 'vermilion-city': 'Ciudad Carmín', 'lavender-town': 'Pueblo Lavanda',
        'celadon-city': 'Ciudad Azulona', 'fuchsia-city': 'Ciudad Fucsia', 'saffron-city': 'Ciudad Azafrán',
        'cinnabar-island': 'Isla Canela', 'viridian-forest': 'Bosque Verde', "digletts-cave": 'Cueva Diglett',
        'mt-moon': 'Monte Moon', 'rock-tunnel': 'Túnel Roca', 'pokemon-tower': 'Torre Pokémon',
        'seafoam-islands': 'Islas Espuma', 'kanto-power-plant': 'Central Energía de Kanto',
        'kanto-safari-zone': 'Zona Safari', 'pokemon-mansion': 'Mansión Pokémon',
        'cerulean-cave': 'Cueva Celeste', 'kanto-victory-road-1': 'Calle Victoria',
        'kanto-victory-road-2': 'Calle Victoria', 'kanto-victory-road-3': 'Calle Victoria',
        'indigo-plateau': 'Meseta Añil', 'ss-anne': 'S.S. Anne', 'berry-forest': 'Bosque de Bayas',
        'mt-ember': 'Monte Brasa', 'one-island': 'Isla Prima', 'two-island': 'Isla Segundo',
        'three-island': 'Isla Tercero', 'four-island': 'Isla Cuarto', 'five-island': 'Isla Quinto',
        'six-island': 'Isla Sexto', 'seven-island': 'Isla Séptimo', 'icefall-cave': 'Cueva de la Cascada Helada',
        'lost-cave': 'Cueva Perdida', 'pattern-bush': 'Matorral Patrón', 'kindle-road': 'Senda Encendida',
        'treasure-beach': 'Playa del Tesoro', 'cape-brink': 'Cabo de la Cima', 'bond-bridge': 'Puente Vínculo',
        'water-labyrinth': 'Laberinto de Agua', 'five-isle-meadow': 'Prado de la Isla Quinto',
        'memorial-pillar': 'Pilar Conmemorativo', 'outcast-island': 'Isla de los Desterrados',
        'green-path': 'Senda Verde', 'water-path': 'Senda del Agua', 'resort-gorgeous': 'Resort Elegante',
        'ruin-valley': 'Valle de las Ruinas', 'trainer-tower': 'Torre del Entrenador',
        'canyon-entrance': 'Entrada del Cañón', 'sevault-canyon': 'Cañón Sevaúl',
        'tanoby-ruins': 'Ruinas Tanoby', 'birth-island': 'Isla Origen', 'navel-rock': 'Roca Ombligo',
        'kanto-altering-cave': 'Cueva Alterante', 'roaming-kanto': 'Zona de avistamiento', 'kanto-pokemart': 'Tienda Pokémon',
        'kanto-pokecenter': 'Centro Pokémon', 'kanto-underground-path': 'Paso subterráneo',
        'new-bark-town': 'Pueblo Primavera', 'cherrygrove-city': 'Ciudad Cáscara',
        'violet-city': 'Ciudad Malva', 'azalea-town': 'Pueblo Azalea', 'goldenrod-city': 'Ciudad Trigal',
        'ecruteak-city': 'Ciudad Iris', 'olivine-city': 'Ciudad Olivo', 'cianwood-city': 'Ciudad Orquídea',
        'blackthorn-city': 'Ciudad Endrino', 'union-cave': 'Cueva Unión', 'slowpoke-well': 'Pozo Slowpoke',
        'ilex-forest': 'Bosque Ilex', 'national-park': 'Parque Nacional', 'dark-cave': 'Cueva Oscura',
        'bell-tower': 'Torre Campana', 'sprout-tower': 'Torre Brote', 'ruins-of-alph': 'Ruinas Alph',
        'whirl-islands': 'Islas Remolino', 'mt-mortar': 'Monte Mortero', 'ice-path': 'Senda de Hielo',
        'lake-of-rage': 'Lago de la Furia', 'dragons-den': 'Guarida Dragón', 'mt-silver': 'Monte Plateado',
        'radio-tower': 'Torre Radio', 'johto-lighthouse': 'Faro', 'team-rocket-hq': 'Cuartel del Team Rocket',
        'goldenrod-tunnel': 'Túnel de Ciudad Trigal', 'mt-silver-cave': 'Cueva del Monte Plateado',
        'safari-zone-gate': 'Puerta de la Zona Safari', 'pokeathlon-dome': 'Domo Pokéathlon',
        'ss-aqua': 'S.S. Aqua', 'cliff-cave': 'Cueva del Acantilado', 'frontier-access': 'Acceso al Frente',
        'bellchime-trail': 'Sendero Campana', 'sinjoh-ruins': 'Ruinas Sinnoh',
        'embedded-tower': 'Torre Incrustada', 'pokewalker': 'Poké Walk', 'cliff-edge-gate': 'Puerta del Acantilado',
        'roaming-johto': 'Zona de avistamiento', 'johto-safari-zone': 'Zona Safari', 'johto-pokemart': 'Tienda Pokémon',
        'littleroot-town': 'Pueblo Hoja', 'oldale-town': 'Pueblo Escaso', 'petalburg-city': 'Ciudad Petalia',
        'rustboro-city': 'Ciudad Férrica', 'dewford-town': 'Pueblo Timbre', 'slateport-city': 'Ciudad Portual',
        'mauville-city': 'Ciudad Malvalona', 'verdanturf-town': 'Pueblo Verdegal',
        'fallarbor-town': 'Pueblo Otoño', 'lavaridge-town': 'Pueblo Lavacalda', 'fortree-city': 'Ciudad Arborada',
        'lilycove-city': 'Ciudad Vasalisca', 'mossdeep-city': 'Ciudad Algaria',
        'sootopolis-city': 'Ciudad Arrecípolis', 'pacifidlog-town': 'Pueblo Flotante',
        'ever-grande-city': 'Ciudad Colosalia', 'mt-chimney': 'Monte Cenizo', 'meteor-falls': 'Cascadas Meteoro',
        'rusturf-tunnel': 'Túnel Rusturf', 'granite-cave': 'Cueva Granito',
        'seafloor-cavern': 'Caverna Submarina', 'sky-pillar': 'Pilar Celeste', 'mirage-tower': 'Torre Espejismo',
        'desert-underpass': 'Paso subterráneo del desierto', 'abandoned-ship': 'Barco Abandonado',
        'scorched-slab': 'Losa Calcinada', 'ancient-tomb': 'Tumba Ancestral', 'battle-tower': 'Torre Batalla',
        'shoal-cave': 'Cueva Somera', 'magma-hideout': 'Escondite Magma', 'aqua-hideout': 'Escondite Aqua',
        'mt-pyre': 'Monte Pira', 'jagged-pass': 'Paso Escarpado', 'fiery-path': 'Senda Llameante',
        'hoenn-safari-zone': 'Zona Safari', 'artisan-cave': 'Cueva Artesana',
        'twinleaf-town': 'Pueblo Céfira', 'sandgem-town': 'Pueblo Arena', 'jubilife-city': 'Ciudad Jubileo',
        'oreburgh-city': 'Ciudad Minera', 'floaroma-town': 'Pueblo Floral', 'eterna-city': 'Ciudad Vetusta',
        'hearthome-city': 'Ciudad Corazón', 'veilstone-city': 'Ciudad Rocavelo',
        'pastoria-city': 'Ciudad Pradera', 'celestic-town': 'Pueblo Celestia', 'canalave-city': 'Ciudad Canal',
        'snowpoint-city': 'Ciudad Puntaneva', 'sunyshore-city': 'Ciudad Marino', 'oreburgh-mine': 'Mina de Ciudad Minera',
        'valley-windworks': 'Central eólica del Valle', 'eterna-forest': 'Bosque Vetusta',
        'great-marsh': 'Gran Pantano', 'mt-coronet': 'Monte Corona', 'iron-island': 'Isla Férrea',
        'lost-tower': 'Torre Perdida', 'ravaged-path': 'Senda Arrasada', 'lake-verity': 'Lago Verity',
        'lake-acuity': 'Lago Agudeza', 'lake-valor': 'Lago Valor', 'snowpoint-temple': 'Templo Puntaneva',
        'spear-pillar': 'Pilar Lanza', 'distortion-world': 'Mundo Distorsión', 'old-chateau': 'Antiguo Palacete',
        'wayward-cave': 'Cueva Sinuosa', 'battleground': 'Campo de Batalla', 'fight-area': 'Zona de Combate',
        'survival-area': 'Zona de Supervivencia', 'resort-area': 'Zona Residencial', 'roaming-sinnoh': 'Zona de avistamiento',
        'nuvema-town': 'Pueblo Césped', 'accumula-town': 'Pueblo Especio', 'striaton-city': 'Ciudad Esmalte',
        'nacrene-city': 'Ciudad Rosal', 'castelia-city': 'Ciudad Mayólica', 'nimbasa-city': 'Ciudad Caolín',
        'driftveil-city': 'Ciudad Porcelana', 'mistralton-city': 'Ciudad Algarabía',
        'icirrus-city': 'Ciudad Escarcha', 'opelucid-city': 'Ciudad Loza', 'lacunosa-town': 'Pueblo Lacunosa',
        'undella-town': 'Pueblo Undella', 'aspertia-city': 'Ciudad Engarce', 'virbank-city': 'Ciudad Ventisca',
        'humilau-city': 'Ciudad Humilau', 'pinwheel-forest': 'Bosque Espiral', 'wellspring-cave': 'Cueva Manantial',
        'chargestone-cave': 'Cueva Electroca', 'twist-mountain': 'Monte Retorcido',
        'dragonspiral-tower': 'Torre Dragón Espiral', 'celestial-tower': 'Torre Celestial',
        'giant-chasm': 'Sima Gigante', 'abundant-shrine': 'Santuario de la Abundancia',
        'relic-castle': 'Castillo Reliquia', 'desert-resort': 'Resor del Desierto', 'p2-laboratory': 'Laboratorio P2',
        'dreamyard': 'Patio de Ensueño', 'liberty-garden': 'Jardín Libertad', 'plasma-frigate': 'Fragata Plasma',
        'seaside-cave': 'Cueva Costera', 'underground-ruins': 'Ruinas Subterráneas',
        'challengers-cave': 'Cueva del Reto', 'roaming-unova': 'Zona de avistamiento',
        'vaniville-town': 'Pueblo Peregrino', 'aquacorde-town': 'Pueblo Aquacorde',
        'santalune-city': 'Ciudad Novarte', 'lumiose-city': 'Ciudad Luminalia', 'camphrier-town': 'Pueblo Campestre',
        'cyllage-city': 'Ciudad Relieve', 'ambrette-town': 'Pueblo Vadeo', 'shalour-city': 'Ciudad Teatral',
        'coumarine-city': 'Ciudad Cormarina', 'laverre-city': 'Ciudad Pitiflor', 'dendemille-town': 'Pueblo Dandel',
        'anistar-city': 'Ciudad Uranio', 'snowbelle-city': 'Ciudad Radiadur',
        'reflection-cave': 'Cueva del Espejo', 'terminus-cave': 'Cueva Términus', 'frost-cavern': 'Caverna Helada',
        'lost-hotel': 'Hotel Abandonado', 'victory-road': 'Calle Victoria', 'kalos-power-plant': 'Central de Kalos',
        'azure-bay': 'Bahía Celeste', 'sea-spirits-den': 'Guarida del Espíritu del Mar',
        'pokemon-village': 'Pueblo Pokémon', 'unknown-dungeon': 'Mazmorra Desconocida',
        'chamber-of-emptiness': 'Cámara del Vacío', 'kalos-route-1': 'Ruta 1', 'roaming-kalos': 'Zona de avistamiento',
        'hauoli-city': 'Ciudad Hauoli', 'hauoli-outskirts': 'Afueras de Hauoli', 'heahea-city': 'Ciudad Heahea',
        'paniola-town': 'Pueblo Paniola', 'royal-avenue': 'Avenida Real', 'konikoni-city': 'Ciudad Konikoni',
        'malie-city': 'Ciudad Malie', 'tapu-village': 'Pueblo Tapu', 'po-town': 'Pueblo Po',
        'seafolk-village': 'Pueblo Marino', 'route-1': 'Ruta 1',
        'motostoke': 'Ciudad Motor', 'wedgehurst': 'Pueblo Engranaje', 'hulbury': 'Ciudad Banslax',
        'hammerlocke': 'Ciudad Pistón', 'stow-on-side': 'Ciudad Crampón', 'ballonlea': 'Ciudad Glaseo',
        'circhester': 'Ciudad Circhester', 'spikemuth': 'Pueblo Puntaguja', 'wyndon': 'Ciudad Wyndon',
        'postwick': 'Pueblo Endrino', 'freezington': 'Pueblo de la Escarcha', 'slumbering-weald': 'Prado Aletargado',
        'wild-area': 'Área Silvestre', 'motostoke-riverbank': 'Ribera de Ciudad Motor',
        'rolling-fields': 'Praderas Onduladas', 'dappled-grove': 'Arboleda Cálida', 'watchtower-ruins': 'Ruinas de la Atalaya',
        'east-lake-axewell': 'Lago Axewell Este', 'west-lake-axewell': 'Lago Axewell Oeste',
        'south-lake-axewell': 'Lago Axewell Sur', 'giants-cap': 'Gorro del Gigante',
        'dusty-bowl': 'Hoya Polvorienta', 'giants-mirror': 'Espejo del Gigante',
        'lake-outrage': 'Lago de la Furia', 'stony-wilderness': 'Yermo Pedregoso',
        'bridge-field': 'Campo del Puente', 'north-lake-miloch': 'Lago Miloch Norte',
        'south-lake-miloch': 'Lago Miloch Sur', 'lakeside-settlement': 'Asentamiento del Lago',
        'axews-eye': 'Ojo de Axew', 'glimwood-tangle': 'Bosque Camuflaje',
        'roaming-galar': 'Zona de avistamiento', 'mesagoza': 'Ciudad Mesagoza', 'los-platos': 'Pueblo Los Platos',
        'cascarrafa': 'Ciudad Cascarrafa', 'artazon': 'Pueblo Artazon', 'levincia': 'Ciudad Levincia',
        'medali': 'Ciudad Medali', 'montenevera': 'Pueblo Montenevera', 'alfornada': 'Pueblo Alfornada',
        'zapapico': 'Pueblo Zapapico', 'puertomarina': 'Puerto Marinada', 'cabo-poco': 'Pueblo Cáscara',
        'mesagoza-area': 'Zona de Ciudad Mesagoza', 'south-province': 'Provincia Sur',
        'east-province': 'Provincia Este', 'west-province': 'Provincia Oeste',
        'north-province': 'Provincia Norte', 'casseroya-lake': 'Lago Casseroya',
        'tagtree-thicket': 'Arboleda Tagtree', 'alfornada-cavern': 'Caverna de Alfornada',
        'socarrat-trail': 'Senda Socarrat'
    }
};

/* -------------------------------------------------------------------------
   Dónde y cómo se consiguen las bayas en cada región (datos curados;
   la PokéAPI no incluye localizaciones de bayas)
   ------------------------------------------------------------------------- */
(function () {
    var ALL = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
    var HOENN = ['Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
    var SINNOH = ['Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
    var KALOS = ['Kalos', 'Alola', 'Galar', 'Paldea'];
    var HOW = {
        tree: 'En árboles de bayas y cultivos de la región',
        field: 'En campos de cultivo de bayas',
        shop: 'Se compra en tiendas o se recibe de regalo',
        rare: 'Solo mediante eventos especiales y regalos misteriosos'
    };
    function set(names, regions, how) {
        names.forEach(function (n) { PW.berryLoc[n] = { regions: regions, how: how }; });
    }
    PW.berryLoc = {};
    set(['cheri', 'chesto', 'pecha', 'rawst', 'aspear', 'leppa', 'oran', 'persim', 'lum', 'sitrus'], ALL, HOW.tree);
    set(['figy', 'wiki', 'mago', 'aguav', 'iapapa'], HOENN, HOW.tree);
    set(['razz', 'bluk', 'nanab', 'wepear', 'pinap'], HOENN, HOW.tree);
    set(['pomeg', 'kelpsy', 'qualot', 'hondew', 'grepa', 'tamato'], HOENN, HOW.tree);
    set(['cornn', 'magost', 'rabuta', 'nomel', 'spelon', 'pamtre', 'watmel', 'durin', 'belue'], HOENN, HOW.tree);
    set(['occa', 'passho', 'wacan', 'rindo', 'yache', 'chople', 'kebia', 'shuca', 'coba', 'payapa', 'tanga', 'charti', 'kasib', 'haban', 'colbur', 'babiri', 'chilan'], SINNOH, HOW.field);
    set(['liechi', 'ganlon', 'salac', 'petaya', 'apicot', 'lansat', 'starf'], HOENN, HOW.tree);
    set(['kee', 'maranga'], KALOS, HOW.field);
    set(['roseli'], KALOS, HOW.field);
    set(['hopo'], ['Paldea'], HOW.field);
    set(['enigma', 'micle', 'custap', 'jaboca', 'rowap'], ['Kanto', 'Hoenn', 'Sinnoh', 'Kalos'], HOW.rare);
})();

PW.utils = {
    cap: function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    pad4: function (n) {
        return ('000' + n).slice(-4);
    },
    idFromUrl: function (url) {
        return parseInt(url.split('/').filter(Boolean).pop(), 10);
    },
    esc: function (str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    },
    debounce: function (fn, wait) {
        var t;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    },
    /* Parsea la parte de query de un hash: "#/dex?region=Kanto&type=fire" */
    parseHashQuery: function (hash) {
        var out = {};
        var qi = hash.indexOf('?');
        if (qi === -1) return out;
        hash.slice(qi + 1).split('&').forEach(function (kv) {
            if (!kv) return;
            var pair = kv.split('=');
            out[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        });
        return out;
    },
    /* Número de generación a partir de la URL de generation de la API */
    genFromUrl: function (url) {
        var m = (url || '').match(/generation-(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    },
    genLabel: function (num) {
        return num ? 'Generación ' + (PW.generationRoman[num] || num) : 'Desconocida';
    },
    findLocalized: function (list, field) {
        if (!list) return null;
        var es = list.filter(function (x) { return x.language && x.language.name === 'es'; })[0];
        var en = list.filter(function (x) { return x.language && x.language.name === 'en'; })[0];
        var pick = es || en;
        return pick ? pick[field] : null;
    },
    formatNum: function (n) {
        return n == null ? 'No disponible' : n;
    },
    genderRatio: function (rate) {
        if (rate == null) return 'No disponible';
        if (rate === -1) return 'Sin género';
        var f = rate / 8 * 100;
        return 'M ' + (100 - f).toFixed(0).replace('.', ',') + '% / H ' + f.toFixed(0).replace('.', ',') + '%';
    },
    /* Multiplicador de un tipo ofensivo contra una lista de tipos defensivos */
    effMultiplier: function (atkType, defTypes) {
        var m = 1;
        defTypes.forEach(function (t) {
            var row = PW.typeChart[atkType];
            if (row && row[t] != null) m *= row[t];
        });
        return m;
    },
    /* Análisis defensivo: débil / resiste / inmune para una combinación de tipos */
    defAnalysis: function (defTypes) {
        var weak = [], resist = [], immune = [], neutral = [];
        PW.types.forEach(function (atk) {
            var m = PW.utils.effMultiplier(atk, defTypes);
            if (m === 0) immune.push({ t: atk, m: m });
            else if (m < 1) resist.push({ t: atk, m: m });
            else if (m > 1) weak.push({ t: atk, m: m });
            else neutral.push({ t: atk, m: m });
        });
        weak.sort(function (a, b) { return b.m - a.m; });
        resist.sort(function (a, b) { return a.m - b.m; });
        return { weak: weak, resist: resist, immune: immune, neutral: neutral };
    },
    /* Elemento helper para construir HTML con atributos */
    typeChip: function (type, extraClass) {
        var color = PW.typeColors[type] || '#888';
        var cls = (typeof extraClass === 'string' && extraClass) ? ' ' + extraClass : '';
        return '<span class="type-chip' + cls + '" style="background:' + color + '">' +
            (PW.typeEs[type] || type) + '</span>';
    },
    typeName: function (type) {
        return PW.typeEs[type] || type;
    },
    capitalize: function (str) {
        return PW.utils.cap(str);
    }
};

/* =========================================================================
   Lore de las regiones: gimnasios, Alto Mando, campeón, antagonistas,
   puntos de interés e historia (contenido editorial en español).
   ========================================================================= */
PW.regionLore = {
    Kanto: {
        history: 'Kanto es la región donde comenzó la aventura Pokémon. Saliendo del Pueblo Paleta, los entrenadores recorren la Ruta 1 hacia Ciudad Verde y se enfrentan a los ocho líderes de gimnasio, al Alto Mando y al campeón en la Meseta Añil. Fue aquí donde nació la Liga Pokémon y donde el Profesor Oak repartió sus primeros Pokémon iniciales.',
        gyms: [
            { city: 'Ciudad Plateada', leader: 'Brock', badge: 'Roca', type: 'rock' },
            { city: 'Ciudad Celeste', leader: 'Misty', badge: 'Cascada', type: 'water' },
            { city: 'Ciudad Carmín', leader: 'Lt. Surge', badge: 'Trueno', type: 'electric' },
            { city: 'Ciudad Azulona', leader: 'Erika', badge: 'Arcoíris', type: 'grass' },
            { city: 'Ciudad Fucsia', leader: 'Koga', badge: 'Alma', type: 'poison' },
            { city: 'Ciudad Azafrán', leader: 'Sabrina', badge: 'Pantano', type: 'psychic' },
            { city: 'Ciudad Canela', leader: 'Blaine', badge: 'Volcán', type: 'fire' },
            { city: 'Ciudad Verde', leader: 'Giovanni', badge: 'Tierra', type: 'ground' }
        ],
        eliteFour: [
            { name: 'Lorelei', type: 'ice' }, { name: 'Bruno', type: 'fighting' },
            { name: 'Agatha', type: 'ghost' }, { name: 'Lance', type: 'dragon' }
        ],
        champion: 'El campeón de la Liga de Kanto es tu rival (Blue). Tras derrotar al Alto Mando, deberás enfrentarte a él en la Meseta Añil.',
        villains: 'El Equipo Rocket, liderado en secreto por el líder de gimnasio Giovanni, intenta robar Pokémon y controlar a las criaturas legendarias de la región.',
        points: [
            'Pueblo Paleta', 'Meseta Añil (Liga)', 'Monte Moon', 'Islas Espuma',
            'Torre Pokémon', 'Mansión Pokémon', 'Central de energía', 'Parque Safari'
        ]
    },
    Johto: {
        history: 'Johto, al oeste de Kanto, conserva la tradición y el misterio: sus torres, sus leyendas sobre Ho-Oh y Lugia y los dos PokéDex del Profesor Elm. Tras los ocho gimnasios se llega al Alto Mando, y los mejores entrenadores vuelven a Kanto para completar la Liga.',
        gyms: [
            { city: 'Ciudad Malva', leader: 'Falkner', badge: 'Céfiro', type: 'flying' },
            { city: 'Ciudad Trituradora', leader: 'Bugsy', badge: 'Colmena', type: 'bug' },
            { city: 'Ciudad Trigal', leader: 'Whitney', badge: 'Claro', type: 'normal' },
            { city: 'Cianópolis', leader: 'Morty', badge: 'Niebla', type: 'ghost' },
            { city: 'Ciudad Buitrera', leader: 'Chuck', badge: 'Puño', type: 'fighting' },
            { city: 'Ciudad Olivo', leader: 'Jasmine', badge: 'Mineral', type: 'steel' },
            { city: 'Ciudad Caoba', leader: 'Pryce', badge: 'Glaciar', type: 'ice' },
            { city: 'Ciudad Endrino', leader: 'Clair', badge: 'Ascuas', type: 'dragon' }
        ],
        eliteFour: [
            { name: 'Will', type: 'psychic' }, { name: 'Koga', type: 'poison' },
            { name: 'Bruno', type: 'fighting' }, { name: 'Karen', type: 'dark' }
        ],
        champion: 'Lance, el maestro de los Pokémon dragón, defiende el trono de campeón de la Liga de Johto.',
        villains: 'El Equipo Rocket reaparece bajo nuevos mandos: los ejecutivos Archer, Proton, Petrel y Ariana buscan a Giovanni y pretenden despertar a las bestias legendarias.',
        points: [
            'Torre Quemada', 'Torre Hojarasca', 'Lagos de Johto', 'Monte Plateado',
            'Gimnasio de Cianópolis', 'Faro de la Ciudad Olivo', 'Ruinas Alpha'
        ]
    },
    Hoenn: {
        history: 'Hoenn, una región de mares y volcanes, vive un conflicto entre dos equipos opuestos: el Equipo Magma y el Equipo Aqua. Sus líderes buscan despertar a Groudon y Kyogre, y solo el protagonista puede detener la catástrofe mientras recorre los ocho gimnasios hacia la Liga.',
        gyms: [
            { city: 'Ciudad Petalia', leader: 'Roxanne', badge: 'Piedra', type: 'rock' },
            { city: 'Pueblo Robliza', leader: 'Brawly', badge: 'Puño', type: 'fighting' },
            { city: 'Mallvilla', leader: 'Wattson', badge: 'Dinamo', type: 'electric' },
            { city: 'Lavadalia', leader: 'Flannery', badge: 'Calor', type: 'fire' },
            { city: 'Ciudad Petalia', leader: 'Norman', badge: 'Equilibrio', type: 'normal' },
            { city: 'Pueblo Fortaleza', leader: 'Winona', badge: 'Pluma', type: 'flying' },
            { city: 'Algaria', leader: 'Vito y Leti', badge: 'Mente', type: 'psychic' },
            { city: 'Arrecípolis', leader: 'Galano', badge: 'Lluvia', type: 'water' }
        ],
        eliteFour: [
            { name: 'Sidney', type: 'dark' }, { name: 'Fátima', type: 'ghost' },
            { name: 'Gracia', type: 'ice' }, { name: 'Drake', type: 'dragon' }
        ],
        champion: 'En Rubí y Zafiro el campeón es Steven (Acero); en Esmeralda, el último líder de gimnasio, Galano (Agua), ocupa el trono.',
        villains: 'El Equipo Magma (Maxie) quiere expandir la tierra firme con Groudon; el Equipo Aqua (Aquiles) quiere cubrirlo todo con Kyogre. Ambos chocan en la cueva del origen.',
        points: [
            'Monte Chimenea', 'Pilar Celeste', 'Cueva del Origen', 'Meteorito',
            'Puente Lindo', 'Pueblo Lavacalda', 'Acuario de Calagua', 'Camino Victoria'
        ]
    },
    Sinnoh: {
        history: 'Sinnoh es una región montañosa dominada por el Monte Corona, donde nace el mito de los Pokémon de la creación: Dialga, Palkia y Giratina. El Equipo Galaxia intenta recrear el universo a su imagen, y el protagonista debe detener a Cyrus en la Zona de Distorsión.',
        gyms: [
            { city: 'Ciudad Pirita', leader: 'Roco', badge: 'Carbón', type: 'rock' },
            { city: 'Ciudad Vetusta', leader: 'Gardenia', badge: 'Bosque', type: 'grass' },
            { city: 'Ciudad Corazón', leader: 'Mananti', badge: 'Cobijo', type: 'fighting' },
            { city: 'Ciudad Arena', leader: 'Fátima', badge: 'Lodo', type: 'water' },
            { city: 'Ciudad Corazón', leader: 'Fantina', badge: 'Lápida', type: 'ghost' },
            { city: 'Ciudad Canal', leader: 'Ladrido', badge: 'Mina', type: 'steel' },
            { city: 'Ciudad Puntaneva', leader: 'Inverna', badge: 'Vela', type: 'ice' },
            { city: 'Ciudad Rocaveta', leader: 'Lino', badge: 'Relámpago', type: 'electric' }
        ],
        eliteFour: [
            { name: 'Alecrán', type: 'bug' }, { name: 'Berta', type: 'ground' },
            { name: 'Fausto', type: 'fire' }, { name: 'Lucian', type: 'psychic' }
        ],
        champion: 'Cynthia, la enigmática campeona de Sinnoh, viaja por la región estudiando los mitos; su equipo combina dragones y Pokémon raros.',
        villains: 'El Equipo Galaxia, dirigido por Cyrus, quiere destruir el mundo actual para crear uno perfecto usando Dialga y Palkia.',
        points: [
            'Monte Corona', 'Zona de Distorsión', 'Lagos Veraz, Valor y Sender',
            'Zona de Combate', 'Casa de Girasol', 'Parque Trofeo', 'Sitio del Metal'
        ]
    },
    Teselia: {
        history: 'Teselia (Unova) es una región moderna y lejana de las demás, donde el legendario Reshiram y Zekrom encarnan la verdad y la ideales. El Equipo Plasma, liderado por Ghetsis y con el joven N al frente, intenta liberar a todos los Pokémon separándolos de los humanos.',
        gyms: [
            { city: 'Ciudad Esmalte', leader: 'Millo, Cheren o Cedric', badge: 'Trío', type: 'grass' },
            { city: 'Nacrene', leader: 'Aloe', badge: 'Básico', type: 'normal' },
            { city: 'Ciudad Mayólica', leader: 'Burgh', badge: 'Insecto', type: 'bug' },
            { city: 'Ciudad Nimbasa', leader: 'Elesa', badge: 'Voltio', type: 'electric' },
            { city: 'Ciudad Caolín', leader: 'Camus', badge: 'Terremoto', type: 'ground' },
            { city: 'Ciudad Hormigón', leader: 'Fueté', badge: 'Vuelo', type: 'flying' },
            { city: 'Ciudad Helada', leader: 'Brycen', badge: 'Glacial', type: 'ice' },
            { city: 'Ciudad de Opelucid', leader: 'Yakón o Iris', badge: 'Leyenda', type: 'dragon' }
        ],
        eliteFour: [
            { name: 'Delicias', type: 'ghost' }, { name: 'Marlon', type: 'fighting' },
            { name: 'Karma', type: 'dark' }, { name: 'Catleya', type: 'psychic' }
        ],
        champion: 'En Negro y Blanco el campeón es Mirto (Alder); en Negro 2 y Blanco 2, la joven campeona Iris asume el título.',
        villains: 'El Equipo Plasma (Ghetsis) usa a N y a los Pokémon legendarios para imponer su ideal; tras ellos se esconde la ambición del propio Ghetsis.',
        points: [
            'Torre de los Cielos', 'Ciudad de Opelucid', 'Bosque de Pinwheel',
            'Desierto del Reloj', 'Puente Maratón', 'Liga de Teselia', 'Cueva de la Verdad'
        ]
    },
    Kalos: {
        history: 'Kalos es la región de la belleza y la elegancia, cuna de la megaevolución. El Equipo Flare, dirigido por Lysandre, quiere crear un mundo hermoso a costa de destruir el actual usando la energía de la planta de Geosenge y la legendaria Xerneas o Yveltal.',
        gyms: [
            { city: 'Ciudad de las Peñas', leader: 'Violeta', badge: 'Bugá', type: 'bug' },
            { city: 'Ciudad Ficticia', leader: 'Grave', badge: 'Ruinas', type: 'rock' },
            { city: 'Ciudad de los Cristales', leader: 'Corina', badge: 'Lucha', type: 'fighting' },
            { city: 'Ciudad de los Arrecifes', leader: 'Ramos', badge: 'Planta', type: 'grass' },
            { city: 'Ciudad Luminalia', leader: 'Lem', badge: 'Voltaje', type: 'electric' },
            { city: 'Ciudad de la Niebla', leader: 'Valerie', badge: 'Hada', type: 'fairy' },
            { city: 'Ciudad de Anistar', leader: 'Ástrid', badge: 'Psique', type: 'psychic' },
            { city: 'Pueblo Botánico', leader: 'Wulfric', badge: 'Hielo', type: 'ice' }
        ],
        eliteFour: [
            { name: 'Malva', type: 'fire' }, { name: 'Siebold', type: 'water' },
            { name: 'Wikstrom', type: 'steel' }, { name: 'Drasna', type: 'dragon' }
        ],
        champion: 'La campeona de Kalos es Diantha, actriz famosa y entrenadora de Pokémon tipo Hada y de su Gardevoir megaevolucionado.',
        villains: 'El Equipo Flare (Lysandre) planea usar la Flor Eterna para reiniciar el mundo; el protagonista y la amiga Serena le plantan cara.',
        points: [
            'Ciudad Luminalia', 'Torre Prisma', 'Planta de Geosenge', 'Monte Pilar',
            'Bosque de Santalune', 'Gruta Reflectora', 'Fábrica de Alfombras', 'Liga de Kalos'
        ]
    },
    Alola: {
        history: 'Alola, archipiélago tropical inspirado en Hawái, no tiene gimnasios tradicionales: los entrenadores superan pruebas insulares y se enfrentan a los Kahuna en cada isla. En la Liga de Alola, el Alto Mando y el campeón esperan al final del recorrido.',
        gyms: [
            { city: 'Isla Melemele', leader: 'Kahuna Hala', badge: 'Prueba de lucha', type: 'fighting' },
            { city: 'Isla Akala', leader: 'Kahuna Olivia', badge: 'Prueba de roca', type: 'rock' },
            { city: 'Isla Ula\u2019ula', leader: 'Kahuna Nanu', badge: 'Prueba de siniestro', type: 'dark' },
            { city: 'Isla Poni', leader: 'Kahuna Hapu', badge: 'Prueba de tierra', type: 'ground' }
        ],
        eliteFour: [
            { name: 'Kahuna Hala', type: 'fighting' }, { name: 'Olivia', type: 'rock' },
            { name: 'Acerola', type: 'ghost' }, { name: 'Kahili', type: 'flying' }
        ],
        champion: 'En Sol y Luna el campeón es el Profesor Kukui; en UltrSol/UltraLuna, Hau alcanza el título.',
        villains: 'El Team Skull (Guzma) y la Fundación Aether (Lusamine) chocan en Alola, mientras los Ultraentes amenazan la región desde los Ultraumbrales.',
        points: [
            'Lago del Sol', 'Volcán de Wela', 'Parque Aether', 'Mina de Hokulani',
            'Túnel de Diglett', 'Mina del Gigante', 'Torre del Cielo de Alola'
        ]
    },
    Galar: {
        history: 'Galar, inspirada en el Reino Unido, gira en torno al fenómeno Dynamax y a las leyendas de Zacian y Zamazenta. No hay Alto Mando clásico: la Copa del Campeonato de Galar enfrenta a los mejores entrenadores, y el campeón Leon defiende su título frente a los aficionados de cada estadio.',
        gyms: [
            { city: 'Turffield', leader: 'Milo', badge: 'Planta', type: 'grass' },
            { city: 'Hulbury', leader: 'Nessa', badge: 'Agua', type: 'water' },
            { city: 'Motostoke', leader: 'Kabu', badge: 'Fuego', type: 'fire' },
            { city: 'Stow-on-Side', leader: 'Bea / Allister', badge: 'Lucha / Fantasma', type: 'fighting' },
            { city: 'Ballonlea', leader: 'Opal', badge: 'Hada', type: 'fairy' },
            { city: 'Circhester', leader: 'Gordie / Melony', badge: 'Roca / Hielo', type: 'rock' },
            { city: 'Spikemuth', leader: 'Piers', badge: 'Siniestro', type: 'dark' },
            { city: 'Hammerlocke', leader: 'Raihan', badge: 'Dragón', type: 'dragon' }
        ],
        eliteFour: 'Galar no tiene Alto Mando: tras los ocho gimnasios se disputa la Copa del Campeonato, una eliminatoria final contra los entrenadores más fuertes de la región.',
        champion: 'Leon, el "campeón imbatible" de Galar, es famoso por su Charizard y por perderse incluso en su propia ciudad.',
        villains: 'El Team Yell anima a Marnie, pero tras ellos está el Chairman Rose y su Macro Cosmos, que desatan la amenaza del legendario Eternatus.',
        points: [
            'Zona Salvaje', 'Bosque del Enfado', 'Torre de la Espada / del Escudo',
            'Ciudad Hammerlocke', 'Faro de la isla', 'Lago del Enfado', 'Estadio de Galar'
        ]
    },
    Paldea: {
        history: 'Paldea, inspirada en la península ibérica, es una región abierta donde el protagonista asiste a la Academia Naranja o Uva. El misterio de la Zona Cero y los Pokémon paradoxales se cruza con la historia de la región, mientras ocho líderes, el Alto Mando y la campeona Geeta aguardan.',
        gyms: [
            { city: 'Cortondo', leader: 'Katy', badge: 'Bicho', type: 'bug' },
            { city: 'Artazon', leader: 'Brassius', badge: 'Planta', type: 'grass' },
            { city: 'Levincia', leader: 'Iono', badge: 'Eléctrico', type: 'electric' },
            { city: 'Cascarrafa', leader: 'Kofu', badge: 'Agua', type: 'water' },
            { city: 'Medali', leader: 'Larry', badge: 'Normal', type: 'normal' },
            { city: 'Montenevera', leader: 'Ryme', badge: 'Fantasma', type: 'ghost' },
            { city: 'Alfornada', leader: 'Tulip', badge: 'Psíquico', type: 'psychic' },
            { city: 'Pueblo Glaseado', leader: 'Grusha', badge: 'Hielo', type: 'ice' }
        ],
        eliteFour: [
            { name: 'Rika', type: 'ground' }, { name: 'Poppy', type: 'steel' },
            { name: 'Larry', type: 'normal' }, { name: 'Hassel', type: 'dragon' }
        ],
        champion: 'Geeta, la campeona de Paldea, dirige también el Alto Mando; su equipo incluye a la legendaria de la región en su forma final.',
        villains: 'El Team Star (los jefes de los cinco equipos estelares) tiene su propio conflicto, y en la Zona Cero se oculta el secreto de los Pokémon paradoxales.',
        points: [
            'Zona Cero', 'Academia Naranja / Uva', 'Levincia', 'Pueblo Meseta',
            'Monte Glaseado', 'Torre de Alfornada', 'Desierto de Asalto', 'Liga de Paldea'
        ]
    }
};
