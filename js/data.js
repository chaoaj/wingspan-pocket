/* Wingspan Pocket (fan-made digital edition) — card data
 * The bird roster uses real species and approximate real-world wingspans.
 * Costs, points, egg limits, powers, flavor text and all artwork are original
 * to this project; they are not copied from the published game cards.
 *
 * Food letters: I invertebrate, S seed, F fish, R fruit, M rodent, W any food, E egg
 *
 * Power syntax
 *   "lay"                       single benefit
 *   "a>b+c"                     arrow: pay a, then gain b and c
 *   "a&b"                       two separate benefits, use either or both
 *   steps: draw:any | draw:bird | draw:bird:X | draw:food:X | tuck:bird | tuck:food:X
 *          hunt:N | lay | degg | dcard:any | dcard:food:X | dcard:bird | alldraw | copy
 *   green: g:ignore:X | g:wild:X | g:powany:X | g:copy
 *
 * Art: "type beak tail | body wing head belly beak legs | mark:color mark:color"
 */

const FOOD = {
  I: { name: 'invertebrate', plural: 'invertebrates' },
  S: { name: 'seed', plural: 'seeds' },
  F: { name: 'fish', plural: 'fish' },
  R: { name: 'fruit', plural: 'fruit' },
  M: { name: 'rodent', plural: 'rodents' },
  W: { name: 'any food', plural: 'any food' },
};
const FOOD_TYPES = ['I', 'S', 'F', 'R', 'M'];

const BIRD_ROWS = [
  ['American Robin', 'Turdus migratorius', 38, 'I R', 3, 3, 'lay', 'Often the first bird singing at dawn in spring.', 'perch short long | #6b6560 #55504c #2f2c2b #c9622f #e3b23c #6b4a3a | eyering:#f4f1ea'],
  ['Northern Cardinal', 'Cardinalis cardinalis', 30, 'S R', 4, 3, 'draw:food:S', 'Both sexes sing, and pairs sometimes trade song phrases.', 'perch cone long | #c41e2a #a3182a #c41e2a #d1323b #e8743b #7a5a4a | face:#141414 crest:#c41e2a'],
  ['Blue Jay', 'Cyanocitta cristata', 40, 'S I', 3, 2, 'draw:bird:S', 'Caches thousands of acorns each fall, helping oak forests spread.', 'perch short long | #4a7fc1 #3a6cb0 #5a8ed0 #e8ecef #222222 #333333 | collar:#1a1a1a crest:#5a8ed0 stripes:#f2f2f2'],
  ['Atlantic Puffin', 'Fratercula arctica', 53, 'F F', 4, 1, 'draw:food:F', 'Can carry a dozen small fish crosswise in its bill.', 'upright big short | #1b1b1f #1b1b1f #1b1b1f #f4f4f2 #e8572a #f08a3a | face:#ecebe6'],
  ['Barn Owl', 'Tyto alba', 107, 'M M', 5, 2, 'hunt:50', 'Its heart-shaped face funnels sound toward its ears.', 'owl hook short | #d9a65a #c8954e #f1e6d6 #f6efe4 #e7d8c4 #c9b9a8 | disc:#fbf6ee eyes:#1a1a1a'],
  ['Bald Eagle', 'Haliaeetus leucocephalus', 203, 'F F M', 6, 1, 'hunt:75', 'Pairs add to the same nest for years until it weighs as much as a car.', 'raptor hook short | #4a3426 #3d2a1f #f5f3ee #4a3426 #f2c230 #f2c230 | tailc:#f5f3ee'],
  ['Secretarybird', 'Sagittarius serpentarius', 203, 'M I E', 7, 1, 'hunt:40', 'Hunts on foot across grassland, striking prey with quick kicks.', 'wader hook long | #b9bec4 #2a2a2e #c3c8cd #c3c8cd #9aa0a6 #f0d9c8 | face:#f08a3a crest:#222222'],
  ['Splendid Fairywren', 'Malurus splendens', 15, 'I', 2, 3, 'draw:bird:I', 'Older offspring often stay to help raise the next brood.', 'perch short long | #2b6fd6 #1d4fa8 #3fa2ef #2b6fd6 #1a1a1a #6b5a4a | collar:#0d1a3a'],
  ['Green-backed Camaroptera', 'Camaroptera brachyura', 15, 'I', 2, 2, 'tuck:food:I', 'Stitches living leaves into a pocket that holds its nest.', 'perch short short | #8c939a #6f9a3e #8c939a #d9dcdf #2a2a2a #c9a58a |'],
  ['Wild Turkey', 'Meleagris gallopavo', 135, 'S R W', 4, 4, 'g:wild:S', 'Roosts high in trees at night despite its heavy body.', 'ground short fan | #4a3a2e #6b4f3a #8fb3d9 #3d2f26 #c9b48a #c86a5a | wattle:#c8232c tailc:#6b4f3a'],
  ['Black Kite', 'Milvus migrans', 137, 'M W', 3, 2, 'g:ignore:M', 'Gathers at grass fires to catch animals fleeing the flames.', 'raptor hook fork | #6b4a33 #4f3624 #9b8a7a #7a573d #f2c230 #f2c230 |'],
  ['American White Pelican', 'Pelecanus erythrorhynchos', 274, 'F F F', 5, 1, 'g:wild:F', 'Groups swim in a line to drive fish into the shallows.', 'duck pouch short | #f5f5f2 #f0f0ec #f5f5f2 #ffffff #f29a3a #f29a3a | tip:#1b1b1b'],
  ['Scissor-tailed Flycatcher', 'Tyrannus forficatus', 38, 'I I', 5, 2, 'alldraw', 'Its long forked tail helps it turn sharply after insects.', 'perch short fork | #c9cdd1 #4a4d52 #d9dcdf #f2c9b8 #222222 #333333 | side:#f08a8a'],
  ['American Redstart', 'Setophaga ruticilla', 20, 'I', 2, 2, 'draw:food:I', 'Flashes orange tail patches to startle insects into flight.', 'perch short long | #1a1a1a #1a1a1a #1a1a1a #f2f2ef #222222 #333333 | patch:#f07a1a side:#f07a1a'],
  ['Common Raven', 'Corvus corax', 116, 'W W', 3, 2, 'dcard:any>draw:any+draw:any', 'Solves multi-step puzzles and remembers faces for years.', 'perch heavy long | #15151a #1c1c24 #15151a #15151a #111111 #222222 |'],
  ['Peregrine Falcon', 'Falco peregrinus', 100, 'M M E', 6, 1, 'hunt:60', 'Reaches extreme speeds in its hunting dive.', 'raptor hook short | #5b6875 #44505c #2a2f36 #efe9df #f2c230 #f2c230 | face:#2a2f36 speckle:#5b6875'],
  ['Great Blue Heron', 'Ardea herodias', 180, 'F F', 4, 2, 'tuck:food:F', 'Stands motionless in shallow water before a lightning strike.', 'wader dagger short | #7d93a8 #6a8199 #f1f1ee #9fb0c0 #e0b23a #6b6050 | crest:#1d1d22 neck:#9fb0c0'],
  ['Emperor Penguin', 'Aptenodytes forsteri', 76, 'F F E', 8, 1, '', 'Males balance one egg on their feet through the Antarctic winter.', 'upright short short | #1d2430 #1d2430 #111418 #f5f3ea #1a1a1a #2a2a2a | cheek:#f6b73c'],
  ['Laughing Kookaburra', 'Dacelo novaeguineae', 65, 'I M', 4, 2, 'hunt:30', 'Family groups call together at dawn and dusk to mark territory.', 'perch heavy short | #e9e1d0 #6b4f3a #e9e1d0 #f1ebdf #3a3a3a #8a8a8a | face:#5a4030 patch:#5d8cc6'],
  ['Rainbow Lorikeet', 'Trichoglossus moluccanus', 46, 'R S', 3, 2, 'g:powany:R', 'A brush-tipped tongue lets it lap up nectar and pollen.', 'parrot hook long | #3aa13f #2f8a36 #2b4fb8 #f0821f #e2402e #808080 | collar:#b6e04a'],
  ['Superb Lyrebird', 'Menura novaehollandiae', 76, 'I I E', 6, 1, 'copy', 'Mimics other birds and even camera shutters in its song.', 'ground short lyre | #6b5a4b #5a4a3e #6b5a4b #7a6a5a #2a2a2a #3a3a3a | tailc:#8a7462'],
  ['Shoebill', 'Balaeniceps rex', 240, 'F F E', 8, 1, '', 'Waits motionless for long stretches for lungfish to surface.', 'wader shoe short | #8e9aa6 #7a8794 #9aa6b2 #a8b3be #c9b48a #4a4a4a | neck:#8e9aa6'],
  ['Resplendent Quetzal', 'Pharomachrus mocinno', 50, 'R R', 4, 2, 'draw:food:R', 'Swallows small wild avocados whole and later brings up the pit.', 'perch short streamers | #2aa15a #1f8a4a #34b067 #d2232a #e8c13a #444444 | crest:#34b067'],
  ['Keel-billed Toucan', 'Ramphastos sulfuratus', 110, 'R R I', 5, 2, 'tuck:food:R', 'Its huge bill is light and helps it shed body heat.', 'perch toucan short | #141414 #141414 #141414 #f3d23a #8ccf4d #3a6fd0 | tip:#e8572a throat:#f3d23a'],
  ['Ruby-throated Hummingbird', 'Archilochus colubris', 10, 'R', 2, 2, 'draw:any', 'Some cross the Gulf of Mexico without stopping on migration.', 'hummer needle short | #3f9b5a #5d6f66 #3f9b5a #e8ece6 #1a1a1a #333333 | throat:#c8102e'],
  ['House Sparrow', 'Passer domesticus', 23, 'S', 1, 4, 'lay', 'Has lived alongside people for thousands of years.', 'perch cone short | #8a6a4a #7a5236 #8a8f94 #cfc8bc #3a3a3a #b08a6a | throat:#1a1a1a cheek:#e8e2d6 stripes:#efe8dc'],
  ['European Starling', 'Sturnus vulgaris', 37, 'I', 1, 3, 'draw:bird', 'Huge flocks move as one in swirling murmurations.', 'perch long short | #1f2a2e #233038 #2a3a3a #2a3a33 #e8c13a #c9806a | speckle:#e8e2c8'],
  ['Mallard', 'Anas platyrhynchos', 89, 'S W', 3, 4, 'lay', 'Feeds by tipping forward to reach plants underwater.', 'duck flat short | #b8b0a6 #7a6a5a #1f7a4a #8a5a3a #e8c13a #f08a2a | collar:#ffffff patch:#3a4fb8'],
  ['Common Loon', 'Gavia immer', 122, 'F F', 4, 2, 'draw:bird:F', 'Dense bones help it dive deep after fish.', 'duck dagger short | #1a1d1f #1f2326 #1a3a32 #f2f2f0 #1a1a1a #2a2a2a | speckle:#ffffff collar:#e8e8e8'],
  ['Osprey', 'Pandion haliaetus', 160, 'F F', 4, 2, 'g:ignore:F', 'Turns fish headfirst in its talons to cut down on drag.', 'raptor hook short | #4a3a2e #3d2f26 #f5f3ee #f5f3ee #222222 #b8c8d0 | face:#3a2f26'],
  ['Great Horned Owl', 'Bubo virginianus', 120, 'M M M', 7, 1, 'hunt:80', 'Starts nesting in winter, sometimes incubating through snow.', 'owl hook short | #8a6a4a #6b5038 #8a6a4a #c9b49a #2a2a2a #c9b49a | disc:#c8955a eyes:#f2b21a crest:#6b5038 speckle:#4a3828'],
  ['Snowy Owl', 'Bubo scandiacus', 140, 'M M E', 7, 2, 'hunt:40', 'Lays more eggs in years when lemmings are plentiful.', 'owl hook short | #f3f3f0 #ecebe6 #f6f6f3 #f6f6f3 #2a2a2a #ececec | speckle:#3a3a3a eyes:#f2c21a disc:#f8f8f5'],
  ['Burrowing Owl', 'Athene cunicularia', 55, 'I M', 3, 3, 'tuck:food:M', 'Nests underground, often in burrows dug by other animals.', 'owl hook short | #8a6a4a #7a5a3a #8a6a4a #e8dcc6 #c9c09a #c9c09a | speckle:#f2ead8 eyes:#f2c21a disc:#a08060 legs:long'],
  ['Red-tailed Hawk', 'Buteo jamaicensis', 125, 'M W', 4, 2, 'hunt:50', 'Its raspy scream is often dubbed in for other raptors in films.', 'raptor hook short | #6b4a33 #5a3d29 #6b4a33 #efe5d6 #3a3a3a #f2c230 | tailc:#c2552e'],
  ['American Kestrel', 'Falco sparverius', 56, 'I M', 3, 2, 'draw:food:M', 'Hovers in place while scanning fields below.', 'raptor hook long | #c9673a #7d8fb8 #8fa3c9 #f1e2cf #3a3a5a #f2c230 | face:#1a1a1a speckle:#3a2a1a'],
  ['Mourning Dove', 'Zenaida macroura', 45, 'S', 2, 3, 'lay', 'Its wings make a soft whistle when it takes off.', 'perch short long | #b8a08a #a8907a #b8a08a #d8c4b0 #2a2a2a #c86a6a | speckle:#2a2a2a'],
  ['Black-capped Chickadee', 'Poecile atricapillus', 20, 'S I', 3, 3, 'tuck:food:S', 'Hides seeds in many spots and remembers where they are.', 'perch short long | #8a9298 #6f777d #f5f5f2 #efe6d6 #1a1a1a #3a3a3a | cap:#141414 throat:#141414'],
  ['Cedar Waxwing', 'Bombycilla cedrorum', 28, 'R', 2, 2, 'tuck:food:R', 'Flock members sometimes pass berries from beak to beak.', 'perch short short | #b8956a #8a8070 #b8956a #e8d9a0 #1a1a1a #3a3a3a | face:#141414 tip:#f2d23a crest:#b8956a'],
  ['Acorn Woodpecker', 'Melanerpes formicivorus', 40, 'S S', 4, 2, 'tuck:food:S', 'Groups store thousands of acorns in holes drilled into one tree.', 'perch dagger short | #1a1a1a #1a1a1a #f2f2ee #f2f2ee #3a3a3a #555555 | cap:#d2232a face:#1a1a1a'],
  ['Pileated Woodpecker', 'Dryocopus pileatus', 74, 'I I', 4, 2, 'draw:food:I', 'Chisels large rectangular holes while hunting carpenter ants.', 'perch dagger short | #1a1a1a #1a1a1a #f2f2ee #1a1a1a #6a6a6a #555555 | crest:#d2232a face:#1a1a1a'],
  ['Barn Swallow', 'Hirundo rustica', 33, 'I', 2, 3, 'degg>draw:any+draw:any', 'Builds cup nests from mud pellets under eaves and bridges.', 'perch short fork | #1f3a6b #1a2f55 #1f3a6b #e8b88a #1a1a1a #333333 | throat:#b84a2a'],
  ['Chimney Swift', 'Chaetura pelagica', 30, 'I', 2, 2, 'draw:any', 'Spends nearly all of its daylight hours on the wing.', 'soar short short | #4a4542 #3d3936 #4a4542 #5a5552 #1a1a1a #333333 |'],
  ['Killdeer', 'Charadrius vociferus', 48, 'I', 2, 3, 'dcard:any>lay', 'Fakes a broken wing to lead predators away from its nest.', 'shore short long | #8a6a4a #7a5a3a #8a6a4a #f5f3ee #1a1a1a #c9b9a0 | collar:#141414 eyering:#d2532a'],
  ['American Flamingo', 'Phoenicopterus ruber', 150, 'I S W', 5, 1, 'g:ignore:I', 'Its color comes from pigments in the shrimp and algae it eats.', 'wader bent short | #f07a7a #e8605a #f28a80 #f59a90 #1a1a1a #e8707a | tip:#1a1a1a neck:#f28a80'],
  ['Wood Duck', 'Aix sponsa', 70, 'S R', 4, 3, 'draw:bird:R', 'Ducklings leap from tree-cavity nests a day after hatching.', 'duck flat short | #6b4a3a #2a3a5a #1f6a4a #8a3a2a #d2232a #f08a2a | face:#ffffff collar:#ffffff crest:#1f6a4a'],
  ['Canada Goose', 'Branta canadensis', 160, 'S S W', 5, 3, 'g:ignore:S', 'Flies in V formations that save energy for the whole flock.', 'goose flat short | #8a7a6a #6b5d50 #141414 #d9d0c4 #141414 #2a2a2a | cheek:#ffffff neck:#141414'],
  ['Sandhill Crane', 'Antigone canadensis', 190, 'S I E', 6, 1, 'alldraw', 'Pairs perform leaping, bowing dances.', 'wader dagger short | #9aa0a6 #8a9096 #a8aeb4 #b4bac0 #3a3a3a #3a3a3a | cap:#d2232a neck:#a8aeb4'],
  ['Roseate Spoonbill', 'Platalea ajaja', 127, 'F I', 4, 2, 'tuck:food:I', 'Sweeps its flat bill side to side to feel for prey.', 'wader spoon short | #f29ab0 #e8708a #f5f3ee #f5b0c0 #9aa08a #c86a6a | neck:#f5e0e6'],
  ['Anhinga', 'Anhinga anhinga', 114, 'F F', 4, 2, 'dcard:food:F>lay+lay', 'Spears fish underwater, then dries its wings in the sun.', 'goose dagger long | #141414 #2a2a2a #141414 #141414 #e8c13a #3a3a3a | speckle:#f2f2ee neck:#141414'],
  ['Common Kingfisher', 'Alcedo atthis', 25, 'F', 2, 2, 'draw:food:F', 'Dives from a perch, correcting for how water bends light.', 'perch dagger short | #1f8ab8 #1a74a8 #1f8ab8 #f08a3a #1a1a1a #f05a3a | cheek:#f08a3a throat:#ffffff'],
  ['Grey Crowned Crane', 'Balearica regulorum', 200, 'S I', 4, 1, 'g:copy', 'A crown of stiff golden feathers stands out on the savanna.', 'wader short short | #6f767d #5f666d #141414 #6f767d #2a2a2a #2a2a2a | crown:#e8c13a cheek:#ffffff wattle:#d2232a neck:#6f767d'],
  ['Hoopoe', 'Upupa epops', 45, 'I', 2, 2, 'tuck:food:I', 'Raises a fan-shaped crest when alarmed or landing.', 'perch curve short | #e09a6a #2a2a2a #e09a6a #f0b08a #2a2a2a #555555 | crest:#e09a6a stripes:#f5f3ee'],
  ['Eurasian Magpie', 'Pica pica', 56, 'W', 2, 2, 'draw:any', 'Recognizes itself in a mirror, a rare ability among animals.', 'perch heavy long | #141414 #1a2a4a #141414 #f5f5f2 #141414 #222222 | patch:#f5f5f2'],
  ['Blue-footed Booby', 'Sula nebouxii', 150, 'F F', 4, 2, 'g:powany:F', 'Males show off their bright feet during courtship.', 'shore dagger short | #8a7a6a #6b5d50 #f2ebe0 #f5f5f2 #6b8aa8 #4ab0d8 | speckle:#f2ebe0'],
  ['Hyacinth Macaw', 'Anodorhynchus hyacinthinus', 120, 'S S R', 5, 1, 'g:wild:R', 'Cracks very hard palm nuts with its powerful beak.', 'parrot hook long | #2b3fa8 #23339a #2b3fa8 #2b3fa8 #1a1a1a #2a2a2a | eyering:#f2d23a'],
  ['Tawny Frogmouth', 'Podargus strigoides', 70, 'I M', 3, 2, 'g:powany:M', 'Freezes and looks like a broken branch when threatened.', 'owl wide short | #8a8076 #7a7066 #8a8076 #a89e94 #6a6058 #6a6058 | speckle:#4a4038 eyes:#f2b21a'],
  ['Little Penguin', 'Eudyptula minor', 30, 'F', 2, 2, 'lay', 'The smallest penguin returns to land only after dark.', 'upright short short | #3a5f8a #3a5f8a #3a5f8a #f5f5f2 #1a1a1a #f2d0c8 |'],
  ['Arctic Tern', 'Sterna paradisaea', 80, 'F I', 4, 2, 'draw:any', 'Sees two summers each year on its pole-to-pole migration.', 'soar dagger fork | #e8ecef #c9d2d9 #f5f5f2 #f5f5f2 #d2232a #d2232a | cap:#141414'],
  ['Andean Condor', 'Vultur gryphus', 320, 'M M W E', 9, 1, '', 'Soars for hours on rising air with barely a wingbeat.', 'soar hook short | #141414 #1a1a1a #c86a5a #141414 #c9b48a #555555 | collar:#f5f5f2 patch:#f5f5f2'],
  ['Common Ostrich', 'Struthio camelus', 200, 'S S I E', 8, 2, '', 'Lays the largest eggs of any living bird.', 'ratite short short | #141414 #1a1a1a #d9b8a8 #f5f5f2 #d9b8a8 #e0a8a0 | neck:#d9b8a8 tailc:#f5f5f2'],
  ['Turkey Vulture', 'Cathartes aura', 170, 'M W', 3, 1, 'draw:bird:M', 'Finds food by smell, a rare skill among birds.', 'raptor hook short | #2a2420 #3a3430 #c8323a #2a2420 #f2ebe0 #c9a8a0 |'],
  ['Northern Mockingbird', 'Mimus polyglottos', 35, 'I R', 3, 2, 'copy', 'Keeps learning new songs throughout its life.', 'perch short long | #8a8f94 #5a5f64 #8a8f94 #e8e8e4 #1a1a1a #333333 | patch:#f5f5f2'],
  ['Eastern Bluebird', 'Sialia sialis', 31, 'I R', 3, 3, 'tuck:bird&draw:any', 'Nest boxes helped this bird recover from steep declines.', 'perch short short | #3a6fd0 #2f5fc0 #3a6fd0 #d2783a #1a1a1a #333333 |'],
  ['Cliff Swallow', 'Petrochelidon pyrrhonota', 30, 'I', 2, 3, 'tuck:bird', 'Colonies plaster hundreds of gourd-shaped mud nests to cliffs.', 'perch short short | #2a3a5a #1f2f4a #2a3a5a #f0e8dc #1a1a1a #333333 | throat:#8a3a2a cap:#e8d9b8'],
  ['Indian Peafowl', 'Pavo cristatus', 140, 'S R W', 5, 2, 'dcard:bird>lay+lay', 'Its shimmering train regrows each year after molting.', 'ground short train | #1f5fb0 #6a7a5a #1f5fb0 #1f5fb0 #8a8a8a #8a8a8a | crest:#1f5fb0 tailc:#2f7a4a'],
  ['Kea', 'Nestor notabilis', 90, 'W R', 3, 2, 'copy', 'This mountain parrot is famously curious about cars and backpacks.', 'parrot hook long | #6b7a3a #5a6a30 #6b7a3a #6b7a3a #3a3a3a #555555 | patch:#e8572a'],
];

function parseSteps(s) { return s.split('+').map(parseStep); }
function parseStep(s) {
  const p = s.split(':');
  switch (p[0]) {
    case 'draw': return { t: 'draw', what: p[1], food: p[2] || null };
    case 'tuck': return { t: 'tuck', what: p[1], food: p[2] || null };
    case 'hunt': return { t: 'hunt', max: +p[1] };
    case 'dcard': return { t: 'dcard', what: p[1], food: p[2] || null };
    default: return { t: p[0] }; // lay, degg, alldraw, copy
  }
}
function parsePower(s) {
  if (!s) return null;
  if (s.startsWith('g:')) {
    const p = s.split(':');
    return { green: true, t: p[1], food: p[2] || null };
  }
  if (s.includes('>')) {
    const [c, g] = s.split('>');
    return { green: false, cost: parseSteps(c), gain: parseSteps(g) };
  }
  if (s.includes('&')) return { green: false, cost: [], gain: s.split('&').map(parseStep), either: true };
  return { green: false, cost: [], gain: parseSteps(s) };
}
function parseArt(s) {
  const [a, c, m] = s.split('|').map(x => x.trim());
  const [type, beak, tail] = a.split(/\s+/);
  const [body, wing, head, belly, bill, legs] = c.split(/\s+/);
  const marks = {};
  (m || '').split(/\s+/).filter(Boolean).forEach(kv => { const i = kv.indexOf(':'); marks[kv.slice(0, i)] = kv.slice(i + 1); });
  return { type, beak, tail, body, wing, head, belly, bill, legs, marks };
}

const BIRDS = BIRD_ROWS.map((r, i) => {
  const cost = r[3].split(/\s+/).filter(Boolean);
  return {
    id: i,
    name: r[0], sci: r[1], wingspan: r[2],
    food: cost.filter(x => x !== 'E'),
    eggCost: cost.filter(x => x === 'E').length,
    points: r[4], eggLimit: r[5],
    powerCode: r[6], power: parsePower(r[6]),
    fact: r[7], art: parseArt(r[8]),
  };
});

/* Each physical card: bird on one side, food on the other. */
const CARDS = BIRDS.map((b, i) => {
  const f1 = FOOD_TYPES[(i * 3 + 1) % 5];
  const food = (i % 6 === 5) ? [f1, FOOD_TYPES[(i * 3 + 3) % 5]] : [f1];
  return { id: i, bird: b, food };
});

function canTuck(b) { const p = b.power; return !!(p && !p.green && [...p.cost, ...p.gain].some(s => s.t === 'tuck' || s.t === 'hunt')); }
function hasFood(b, f) { return b.food.includes(f); }

/* Goal cards: double-sided. test(slot, flock, index, isAutoma) -> bool */
const GOALS = [
  { automa: true, sides: [
    { text: 'at least 1 card tucked behind it', test: (s, fl, i, auto) => auto ? canTuck(s.card.bird) : s.tucked.length > 0, stat: canTuck, statNote: 'can tuck' },
    { text: 'an egg in its cost', test: s => s.card.bird.eggCost > 0, stat: b => b.eggCost > 0 } ] },
  { automa: true, sides: [
    { text: 'a value of 3 or fewer points', test: s => s.card.bird.points <= 3, stat: b => b.points <= 3 },
    { text: 'a value of 6 or more points', test: s => s.card.bird.points >= 6, stat: b => b.points >= 6 } ] },
  { automa: false, sides: [
    { text: 'more points than every bird to its left', test: (s, fl, i) => fl.slice(0, i).every(o => o.card.bird.points < s.card.bird.points) },
    { text: 'a larger wingspan than every bird to its left', test: (s, fl, i) => fl.slice(0, i).every(o => o.card.bird.wingspan < s.card.bird.wingspan) } ] },
  { automa: false, sides: [
    { text: 'room for more eggs (not full)', test: s => s.eggs < s.card.bird.eggLimit },
    { text: 'an egg limit of exactly 1', test: s => s.card.bird.eggLimit === 1, stat: b => b.eggLimit === 1 } ] },
  { automa: true, sides: [
    { text: 'an egg limit of 3 or more', test: s => s.card.bird.eggLimit >= 3, stat: b => b.eggLimit >= 3 },
    { text: 'a green (ongoing) power', test: s => !!(s.card.bird.power && s.card.bird.power.green), stat: b => !!(b.power && b.power.green) } ] },
  { automa: true, sides: [
    { text: 'invertebrate in its cost', food: 'I', test: s => hasFood(s.card.bird, 'I'), stat: b => hasFood(b, 'I') },
    { text: 'seed in its cost', food: 'S', test: s => hasFood(s.card.bird, 'S'), stat: b => hasFood(b, 'S') } ] },
  { automa: true, sides: [
    { text: 'fish in its cost', food: 'F', test: s => hasFood(s.card.bird, 'F'), stat: b => hasFood(b, 'F') },
    { text: 'rodent in its cost', food: 'M', test: s => hasFood(s.card.bird, 'M'), stat: b => hasFood(b, 'M') } ] },
  { automa: true, sides: [
    { text: 'fruit in its cost', food: 'R', test: s => hasFood(s.card.bird, 'R'), stat: b => hasFood(b, 'R') },
    { text: 'a wingspan of 100 cm or more', test: s => s.card.bird.wingspan >= 100, stat: b => b.wingspan >= 100 } ] },
  { automa: true, sides: [
    { text: 'a wingspan under 40 cm', test: s => s.card.bird.wingspan < 40, stat: b => b.wingspan < 40 },
    { text: '3 or more food in its cost', test: s => s.card.bird.food.length >= 3, stat: b => b.food.length >= 3 } ] },
];
GOALS.forEach(g => g.sides.forEach(s => {
  if (s.stat) s.pct = Math.round(100 * BIRDS.filter(s.stat).length / BIRDS.length);
}));

/* Automa cards (original designs following the rulebook's structure).
 * food: food-deck positions (0-3) she draws from; tuck: bird-supply positions she tucks.
 * cost: food cards needed to play a bird; sel: 'goal' or a supply position (0-3);
 * arrow: tiebreak direction for goal-based picks; eggs: eggs laid in phase 3. */
const AUTOMA_CARDS = [
  { id: '1', food: [0], tuck: [], cost: 3, sel: 'goal', arrow: 'ltr', eggs: 1 },
  { id: '2', food: [1, 3], tuck: [], cost: 4, sel: 1, arrow: 'ltr', eggs: 0 },
  { id: '3', food: [2], tuck: [2], cost: 4, sel: 'goal', arrow: 'rtl', eggs: 1 },
  { id: '4', food: [3], tuck: [0], cost: 3, sel: 3, arrow: 'rtl', eggs: 1 },
  { id: '5', food: [0, 2], tuck: [], cost: 5, sel: 'goal', arrow: 'ltr', eggs: 0 },
  { id: '6', food: [1], tuck: [3], cost: 3, sel: 0, arrow: 'ltr', eggs: 1 },
  { id: '7', food: [3, 1], tuck: [1], cost: 4, sel: 'goal', arrow: 'rtl', eggs: 1 },
  { id: '8', food: [2, 0], tuck: [], cost: 4, sel: 2, arrow: 'ltr', eggs: 1 },
];
const AUTOMA_HARD = [
  { id: '1 HARD', food: [0, 1], tuck: [2], cost: 4, sel: 'goal', arrow: 'ltr', eggs: 1 },
  { id: '2 HARD', food: [2, 3], tuck: [0], cost: 4, sel: 'goal', arrow: 'rtl', eggs: 1 },
  { id: '3 HARD', food: [1], tuck: [1, 3], cost: 3, sel: 1, arrow: 'ltr', eggs: 1 },
];
