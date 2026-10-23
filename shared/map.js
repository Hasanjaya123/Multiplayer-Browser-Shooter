// Expanded Outpost Map Geometry (4400 x 1650 World)
// Preserves the entire classic Mini Militia "Outpost" core while adding:
// - Western Watchtower Cliff & Canyon
// - High-Altitude Sky Islands
// - Far-East Concrete Pillbox & Stepped Trench
// - Deep Subterranean Cavern Network beneath the main tunnels
// - Natural non-glowing Ground Weapons & Military Resource Crates

import { WEAPON_IDS } from './weapons.js';
import { RESOURCE_IDS } from './constants.js';

// Coordinate shift for the classic Outpost core so West, East, Sky, and Deep Caverns surround it seamlessly
const OX = 480;
const OY = 150;

export const BACKGROUND_POLYGONS = [
  // ==================== CLASSIC OUTPOST CORE BACKGROUNDS ====================
  // 1. Left Metallic Bunker Interior Back Wall
  {
    id: 'bg_left_bunker',
    type: 'bunker_metal_bg',
    vertices: [
      { x: 335 + OX, y: 175 + OY },
      { x: 590 + OX, y: 175 + OY },
      { x: 590 + OX, y: 375 + OY },
      { x: 335 + OX, y: 375 + OY }
    ],
    windows: [
      { x: 378 + OX, y: 215 + OY, w: 34, h: 32 },
      { x: 444 + OX, y: 215 + OY, w: 34, h: 32 },
      { x: 510 + OX, y: 215 + OY, w: 34, h: 32 }
    ]
  },

  // 2. Dirt mound right of Left Bunker
  {
    id: 'bg_left_bunker_mound',
    type: 'dirt_bg',
    vertices: [
      { x: 610 + OX, y: 415 + OY },
      { x: 638 + OX, y: 340 + OY },
      { x: 668 + OX, y: 308 + OY },
      { x: 695 + OX, y: 315 + OY },
      { x: 725 + OX, y: 365 + OY },
      { x: 750 + OX, y: 465 + OY },
      { x: 610 + OX, y: 440 + OY }
    ]
  },

  // 3. Left Cave Left Support Pillar
  {
    id: 'bg_left_pillar_1',
    type: 'dirt_bg',
    vertices: [
      { x: 255 + OX, y: 485 + OY },
      { x: 345 + OX, y: 495 + OY },
      { x: 330 + OX, y: 585 + OY },
      { x: 345 + OX, y: 675 + OY },
      { x: 395 + OX, y: 745 + OY },
      { x: 225 + OX, y: 745 + OY },
      { x: 265 + OX, y: 665 + OY },
      { x: 280 + OX, y: 575 + OY }
    ]
  },

  // 4. Left Cave Right Support Pillar
  {
    id: 'bg_left_pillar_2',
    type: 'dirt_bg',
    vertices: [
      { x: 630 + OX, y: 540 + OY },
      { x: 735 + OX, y: 530 + OY },
      { x: 725 + OX, y: 635 + OY },
      { x: 750 + OX, y: 742 + OY },
      { x: 615 + OX, y: 742 + OY },
      { x: 642 + OX, y: 640 + OY }
    ]
  },

  // 5. Left-Center Narrow Hourglass Dirt Spire
  {
    id: 'bg_left_center_spire',
    type: 'dirt_bg',
    vertices: [
      { x: 905 + OX, y: 330 + OY },
      { x: 938 + OX, y: 330 + OY },
      { x: 942 + OX, y: 385 + OY },
      { x: 985 + OX, y: 465 + OY },
      { x: 1018 + OX, y: 540 + OY },
      { x: 985 + OX, y: 615 + OY },
      { x: 998 + OX, y: 690 + OY },
      { x: 915 + OX, y: 690 + OY },
      { x: 945 + OX, y: 610 + OY },
      { x: 915 + OX, y: 535 + OY },
      { x: 892 + OX, y: 455 + OY },
      { x: 890 + OX, y: 385 + OY }
    ]
  },

  // 6. Center-Left Cave Column
  {
    id: 'bg_center_left_column',
    type: 'dirt_bg',
    vertices: [
      { x: 1175 + OX, y: 375 + OY },
      { x: 1265 + OX, y: 375 + OY },
      { x: 1255 + OX, y: 440 + OY },
      { x: 1245 + OX, y: 495 + OY },
      { x: 1185 + OX, y: 605 + OY },
      { x: 1215 + OX, y: 695 + OY },
      { x: 1065 + OX, y: 710 + OY },
      { x: 1095 + OX, y: 595 + OY },
      { x: 1065 + OX, y: 480 + OY },
      { x: 1095 + OX, y: 425 + OY },
      { x: 1145 + OX, y: 430 + OY },
      { x: 1185 + OX, y: 465 + OY },
      { x: 1192 + OX, y: 425 + OY }
    ]
  },

  // 7. Continuous Underground Tunnel & Deep Subterranean Cavern Backing
  {
    id: 'bg_underground_tunnel',
    type: 'dirt_bg',
    vertices: [
      { x: 435 + OX, y: 742 + OY },
      { x: 550 + OX, y: 742 + OY },
      { x: 550 + OX, y: 815 + OY },
      { x: 925 + OX, y: 815 + OY },
      { x: 935 + OX, y: 660 + OY },
      { x: 1040 + OX, y: 660 + OY },
      { x: 1045 + OX, y: 785 + OY },
      { x: 1470 + OX, y: 825 + OY },
      { x: 1485 + OX, y: 650 + OY },
      { x: 1585 + OX, y: 565 + OY },
      { x: 1745 + OX, y: 545 + OY },
      { x: 1845 + OX, y: 600 + OY },
      { x: 1715 + OX, y: 745 + OY },
      { x: 2680 + OX, y: 920 + OY },
      { x: 2680 + OX, y: 1320 + OY },
      { x: 1965, y: 1475 },
      { x: 1945, y: 1350 },
      { x: 1690, y: 1350 },
      { x: 1675, y: 1475 },
      { x: 420 + OX, y: 1320 + OY },
      { x: 445 + OX, y: 965 + OY }
    ]
  },

  // 8. Right-Center Tall Arch & Pillar System
  {
    id: 'bg_right_arch_system',
    type: 'dirt_bg',
    vertices: [
      { x: 2150 + OX, y: 295 + OY },
      { x: 2245 + OX, y: 280 + OY },
      { x: 2375 + OX, y: 355 + OY },
      { x: 2515 + OX, y: 410 + OY },
      { x: 2565 + OX, y: 265 + OY },
      { x: 2625 + OX, y: 215 + OY },
      { x: 2685 + OX, y: 265 + OY },
      { x: 2795 + OX, y: 345 + OY },
      { x: 2895 + OX, y: 375 + OY },
      { x: 2875 + OX, y: 415 + OY },
      { x: 2745 + OX, y: 380 + OY },
      { x: 2665 + OX, y: 325 + OY },
      { x: 2515 + OX, y: 445 + OY },
      { x: 2435 + OX, y: 465 + OY },
      { x: 2445 + OX, y: 635 + OY },
      { x: 2395 + OX, y: 655 + OY },
      { x: 2365 + OX, y: 575 + OY },
      { x: 2335 + OX, y: 735 + OY },
      { x: 2165 + OX, y: 735 + OY },
      { x: 2215 + OX, y: 570 + OY },
      { x: 2245 + OX, y: 465 + OY },
      { x: 2195 + OX, y: 365 + OY }
    ]
  },

  // 9. Right Wooden Bunker Interior Back Wall
  {
    id: 'bg_right_bunker',
    type: 'bunker_wood_bg',
    vertices: [
      { x: 2735 + OX, y: 475 + OY },
      { x: 2995 + OX, y: 475 + OY },
      { x: 2995 + OX, y: 635 + OY },
      { x: 2735 + OX, y: 635 + OY }
    ],
    windows: [
      { x: 2782 + OX, y: 512 + OY, w: 34, h: 32 },
      { x: 2848 + OX, y: 512 + OY, w: 34, h: 32 },
      { x: 2914 + OX, y: 512 + OY, w: 34, h: 32 }
    ]
  },

  // ==================== EXPANDED MAP BACKGROUNDS ====================
  // 10. Western Frontier Cave & Pillar Backing
  {
    id: 'bg_west_frontier',
    type: 'dirt_bg',
    vertices: [
      { x: 185, y: 320 },
      { x: 295, y: 320 },
      { x: 340, y: 660 },
      { x: 690, y: 550 },
      { x: 690, y: 890 },
      { x: 495, y: 960 },
      { x: 210, y: 980 },
      { x: 165, y: 680 }
    ]
  },

  // 11. Western Wooden Watchtower Back Wall
  {
    id: 'bg_west_watchtower',
    type: 'bunker_wood_bg',
    vertices: [
      { x: 125, y: 495 },
      { x: 350, y: 495 },
      { x: 350, y: 665 },
      { x: 125, y: 665 }
    ],
    windows: [
      { x: 175, y: 535, w: 34, h: 32 },
      { x: 255, y: 535, w: 34, h: 32 }
    ]
  },

  // 12. High Central Sky Mesa Arch
  {
    id: 'bg_high_center_arch',
    type: 'dirt_bg',
    vertices: [
      { x: 2040, y: 240 },
      { x: 2160, y: 240 },
      { x: 2230, y: 460 },
      { x: 2110, y: 560 },
      { x: 2020, y: 450 }
    ]
  },

  // 13. Eastern Outpost Arch & Trench Backing
  {
    id: 'bg_east_expansion',
    type: 'dirt_bg',
    vertices: [
      { x: 3520, y: 620 },
      { x: 3740, y: 510 },
      { x: 3980, y: 620 },
      { x: 3980, y: 860 },
      { x: 3520, y: 860 }
    ]
  },

  // 14. Far-East Concrete Pillbox Back Wall
  {
    id: 'bg_east_pillbox',
    type: 'bunker_metal_bg',
    vertices: [
      { x: 3975, y: 555 },
      { x: 4235, y: 555 },
      { x: 4235, y: 745 },
      { x: 3975, y: 745 }
    ],
    windows: [
      { x: 4018, y: 595, w: 34, h: 32 },
      { x: 4084, y: 595, w: 34, h: 32 },
      { x: 4150, y: 595, w: 34, h: 32 }
    ]
  }
];

// Solid, collidable Foreground Polygons
export const RAW_COLLISION_POLYGONS = [
  // ==================== CLASSIC OUTPOST CORE STRUCTURES ====================
  // 1A. Left Bunker Roof Rubble Mound
  {
    id: 'left_bunker_rubble',
    material: 'rock',
    noGrass: true,
    vertices: [
      { x: 322 + OX, y: 162 + OY },
      { x: 385 + OX, y: 132 + OY },
      { x: 465 + OX, y: 114 + OY },
      { x: 535 + OX, y: 130 + OY },
      { x: 598 + OX, y: 162 + OY }
    ]
  },

  // 1B. Left Metallic Bunker Upper Roof & Front Visor
  {
    id: 'left_bunker_roof',
    material: 'metal',
    noGrass: true,
    vertices: [
      { x: 308 + OX, y: 162 + OY },
      { x: 616 + OX, y: 162 + OY },
      { x: 616 + OX, y: 262 + OY },
      { x: 575 + OX, y: 278 + OY },
      { x: 552 + OX, y: 265 + OY },
      { x: 354 + OX, y: 265 + OY },
      { x: 308 + OX, y: 265 + OY }
    ]
  },

  // 1C. Left Metallic Bunker Back Wall, Floor & Front Cover Lip
  {
    id: 'left_bunker_body',
    material: 'metal',
    noGrass: true,
    vertices: [
      { x: 308 + OX, y: 265 + OY },
      { x: 354 + OX, y: 265 + OY },
      { x: 354 + OX, y: 352 + OY },
      { x: 538 + OX, y: 352 + OY },
      { x: 576 + OX, y: 324 + OY },
      { x: 616 + OX, y: 340 + OY },
      { x: 616 + OX, y: 410 + OY },
      { x: 308 + OX, y: 410 + OY }
    ]
  },

  // 2. Upper-Left Cliff Island (Supporting Left Bunker)
  {
    id: 'upper_left_cliff',
    material: 'earth',
    vertices: [
      { x: 198 + OX, y: 408 + OY },
      { x: 308 + OX, y: 408 + OY },
      { x: 616 + OX, y: 408 + OY },
      { x: 675 + OX, y: 442 + OY },
      { x: 735 + OX, y: 464 + OY },
      { x: 785 + OX, y: 466 + OY },
      { x: 772 + OX, y: 532 + OY },
      { x: 712 + OX, y: 582 + OY },
      { x: 638 + OX, y: 558 + OY },
      { x: 575 + OX, y: 592 + OY },
      { x: 525 + OX, y: 572 + OY },
      { x: 482 + OX, y: 606 + OY },
      { x: 422 + OX, y: 565 + OY },
      { x: 365 + OX, y: 515 + OY },
      { x: 292 + OX, y: 522 + OY },
      { x: 222 + OX, y: 492 + OY }
    ]
  },

  // 3. Tiny Floating Rock Left-Center
  {
    id: 'tiny_left_center_rock',
    material: 'earth',
    vertices: [
      { x: 882 + OX, y: 276 + OY },
      { x: 922 + OX, y: 248 + OY },
      { x: 962 + OX, y: 278 + OY },
      { x: 948 + OX, y: 328 + OY },
      { x: 922 + OX, y: 355 + OY },
      { x: 896 + OX, y: 328 + OY }
    ]
  },

  // 4. Upper-Center-Left Diamond Island
  {
    id: 'upper_diamond_island',
    material: 'earth',
    vertices: [
      { x: 1135 + OX, y: 292 + OY },
      { x: 1185 + OX, y: 242 + OY },
      { x: 1238 + OX, y: 185 + OY },
      { x: 1292 + OX, y: 245 + OY },
      { x: 1345 + OX, y: 292 + OY },
      { x: 1330 + OX, y: 355 + OY },
      { x: 1280 + OX, y: 396 + OY },
      { x: 1205 + OX, y: 396 + OY },
      { x: 1150 + OX, y: 352 + OY }
    ]
  },

  // 5. Middle-Left Floating Platform
  {
    id: 'middle_left_platform',
    material: 'earth',
    vertices: [
      { x: 1008 + OX, y: 480 + OY },
      { x: 1100 + OX, y: 478 + OY },
      { x: 1195 + OX, y: 478 + OY },
      { x: 1282 + OX, y: 475 + OY },
      { x: 1265 + OX, y: 555 + OY },
      { x: 1220 + OX, y: 612 + OY },
      { x: 1140 + OX, y: 618 + OY },
      { x: 1055 + OX, y: 598 + OY },
      { x: 1018 + OX, y: 540 + OY }
    ]
  },

  // 6. Center "Ski-Jump" Sloped Island
  {
    id: 'center_sloped_island',
    material: 'earth',
    vertices: [
      { x: 1498 + OX, y: 412 + OY },
      { x: 1585 + OX, y: 415 + OY },
      { x: 1665 + OX, y: 412 + OY },
      { x: 1735 + OX, y: 355 + OY },
      { x: 1795 + OX, y: 298 + OY },
      { x: 1855 + OX, y: 302 + OY },
      { x: 1905 + OX, y: 325 + OY },
      { x: 1912 + OX, y: 385 + OY },
      { x: 1865 + OX, y: 475 + OY },
      { x: 1785 + OX, y: 555 + OY },
      { x: 1695 + OX, y: 608 + OY },
      { x: 1590 + OX, y: 602 + OY },
      { x: 1520 + OX, y: 555 + OY },
      { x: 1495 + OX, y: 480 + OY }
    ]
  },

  // 7. Upper-Right High Plateau Island
  {
    id: 'upper_right_plateau',
    material: 'earth',
    vertices: [
      { x: 2052 + OX, y: 188 + OY },
      { x: 2155 + OX, y: 184 + OY },
      { x: 2258 + OX, y: 198 + OY },
      { x: 2245 + OX, y: 275 + OY },
      { x: 2190 + OX, y: 325 + OY },
      { x: 2110 + OX, y: 322 + OY },
      { x: 2062 + OX, y: 265 + OY }
    ]
  },

  // 8. Middle-Right Floating Island
  {
    id: 'middle_right_island',
    material: 'earth',
    vertices: [
      { x: 2172 + OX, y: 478 + OY },
      { x: 2295 + OX, y: 475 + OY },
      { x: 2345 + OX, y: 428 + OY },
      { x: 2438 + OX, y: 430 + OY },
      { x: 2442 + OX, y: 495 + OY },
      { x: 2385 + OX, y: 555 + OY },
      { x: 2315 + OX, y: 598 + OY },
      { x: 2225 + OX, y: 588 + OY },
      { x: 2180 + OX, y: 535 + OY }
    ]
  },

  // 9. Upper-Right Steep Diagonal Ramp Island
  {
    id: 'upper_right_diagonal_ramp',
    material: 'earth',
    vertices: [
      { x: 2488 + OX, y: 408 + OY },
      { x: 2565 + OX, y: 335 + OY },
      { x: 2645 + OX, y: 255 + OY },
      { x: 2712 + OX, y: 192 + OY },
      { x: 2748 + OX, y: 225 + OY },
      { x: 2715 + OX, y: 305 + OY },
      { x: 2655 + OX, y: 365 + OY },
      { x: 2605 + OX, y: 475 + OY },
      { x: 2555 + OX, y: 455 + OY },
      { x: 2515 + OX, y: 488 + OY },
      { x: 2485 + OX, y: 448 + OY }
    ]
  },

  // 10. Right Overhang Rock Tip (Above Right Bunker)
  {
    id: 'right_overhang_tip',
    material: 'earth',
    vertices: [
      { x: 2858 + OX, y: 390 + OY },
      { x: 2905 + OX, y: 358 + OY },
      { x: 2938 + OX, y: 395 + OY },
      { x: 2920 + OX, y: 432 + OY },
      { x: 2895 + OX, y: 448 + OY },
      { x: 2872 + OX, y: 425 + OY }
    ]
  },

  // 11. Bottom-Left Ground Island
  {
    id: 'bottom_left_ground',
    material: 'earth',
    vertices: [
      { x: 78 + OX, y: 742 + OY },
      { x: 210 + OX, y: 740 + OY },
      { x: 345 + OX, y: 740 + OY },
      { x: 462 + OX, y: 745 + OY },
      { x: 465 + OX, y: 815 + OY },
      { x: 452 + OX, y: 915 + OY },
      { x: 452 + OX, y: 985 + OY },
      { x: 365 + OX, y: 1010 + OY },
      { x: 275 + OX, y: 965 + OY },
      { x: 190 + OX, y: 960 + OY },
      { x: 110 + OX, y: 935 + OY },
      { x: 78 + OX, y: 845 + OY }
    ]
  },

  // 12. Lower-Left-Center Ground Slab (Roof of Left Underground Tunnel)
  {
    id: 'lower_left_tunnel_roof',
    material: 'earth',
    vertices: [
      { x: 528 + OX, y: 742 + OY },
      { x: 625 + OX, y: 738 + OY },
      { x: 765 + OX, y: 738 + OY },
      { x: 885 + OX, y: 735 + OY },
      { x: 925 + OX, y: 665 + OY },
      { x: 958 + OX, y: 655 + OY },
      { x: 960 + OX, y: 735 + OY },
      { x: 945 + OX, y: 815 + OY },
      { x: 880 + OX, y: 835 + OY },
      { x: 765 + OX, y: 825 + OY },
      { x: 645 + OX, y: 845 + OY },
      { x: 540 + OX, y: 835 + OY },
      { x: 525 + OX, y: 790 + OY }
    ]
  },

  // 13. Lower-Center Ground Slab (Roof of Center Underground Tunnel)
  {
    id: 'lower_center_tunnel_roof',
    material: 'earth',
    vertices: [
      { x: 1022 + OX, y: 655 + OY },
      { x: 1065 + OX, y: 675 + OY },
      { x: 1115 + OX, y: 725 + OY },
      { x: 1175 + OX, y: 720 + OY },
      { x: 1222 + OX, y: 648 + OY },
      { x: 1285 + OX, y: 718 + OY },
      { x: 1395 + OX, y: 720 + OY },
      { x: 1508 + OX, y: 722 + OY },
      { x: 1505 + OX, y: 795 + OY },
      { x: 1445 + OX, y: 865 + OY },
      { x: 1345 + OX, y: 880 + OY },
      { x: 1235 + OX, y: 835 + OY },
      { x: 1115 + OX, y: 818 + OY },
      { x: 1035 + OX, y: 790 + OY },
      { x: 1020 + OX, y: 730 + OY }
    ]
  },

  // 14. Underground Tunnel Middle Floor (With West & East Drop Shafts into the Deep Subterranean Cavern!)
  {
    id: 'underground_tunnel_floor',
    material: 'earth',
    noGrass: true,
    vertices: [
      { x: 520 + OX, y: 925 + OY },
      { x: 620 + OX, y: 932 + OY },
      { x: 780 + OX, y: 930 + OY },
      { x: 950 + OX, y: 928 + OY },
      { x: 1120 + OX, y: 925 + OY },
      { x: 1250 + OX, y: 945 + OY },
      { x: 1380 + OX, y: 1005 + OY },
      { x: 1480 + OX, y: 1045 + OY },
      { x: 1465 + OX, y: 1115 + OY },
      { x: 1340 + OX, y: 1105 + OY },
      { x: 1180 + OX, y: 1035 + OY },
      { x: 995 + OX, y: 1055 + OY },
      { x: 820 + OX, y: 1025 + OY },
      { x: 645 + OX, y: 1040 + OY },
      { x: 520 + OX, y: 1015 + OY }
    ]
  },

  // 15. Right Main Ground Continent
  {
    id: 'right_main_continent',
    material: 'earth',
    vertices: [
      { x: 1620 + OX, y: 995 + OY },
      { x: 1622 + OX, y: 850 + OY },
      { x: 1625 + OX, y: 718 + OY },
      { x: 1715 + OX, y: 705 + OY },
      { x: 1785 + OX, y: 645 + OY },
      { x: 1842 + OX, y: 588 + OY },
      { x: 1895 + OX, y: 635 + OY },
      { x: 1935 + OX, y: 662 + OY },
      { x: 2035 + OX, y: 662 + OY },
      { x: 2135 + OX, y: 665 + OY },
      { x: 2175 + OX, y: 725 + OY },
      { x: 2350 + OX, y: 725 + OY },
      { x: 2520 + OX, y: 725 + OY },
      { x: 2640 + OX, y: 722 + OY },
      { x: 2675 + OX, y: 668 + OY },
      { x: 2710 + OX, y: 665 + OY },
      { x: 3015 + OX, y: 665 + OY },
      { x: 3058 + OX, y: 668 + OY },
      { x: 3055 + OX, y: 795 + OY },
      { x: 3005 + OX, y: 925 + OY },
      { x: 2905 + OX, y: 1015 + OY },
      { x: 2815 + OX, y: 965 + OY },
      { x: 2685 + OX, y: 975 + OY },
      { x: 2545 + OX, y: 968 + OY },
      { x: 2395 + OX, y: 972 + OY },
      { x: 2245 + OX, y: 965 + OY },
      { x: 2105 + OX, y: 975 + OY },
      { x: 1965 + OX, y: 968 + OY },
      { x: 1845 + OX, y: 1045 + OY },
      { x: 1715 + OX, y: 1055 + OY }
    ]
  },

  // 16A. Right Wooden Log Bunker Left Roof Overhang
  {
    id: 'right_bunker_left_roof',
    material: 'wood',
    noGrass: true,
    vertices: [
      { x: 2710 + OX, y: 452 + OY },
      { x: 2822 + OX, y: 452 + OY },
      { x: 2822 + OX, y: 500 + OY },
      { x: 2710 + OX, y: 506 + OY }
    ]
  },

  // 16B. Right Wooden Log Bunker Right Roof & Back Wall
  {
    id: 'right_bunker_right_wall',
    material: 'wood',
    noGrass: true,
    vertices: [
      { x: 2898 + OX, y: 452 + OY },
      { x: 3015 + OX, y: 452 + OY },
      { x: 3015 + OX, y: 604 + OY },
      { x: 2968 + OX, y: 604 + OY },
      { x: 2968 + OX, y: 500 + OY },
      { x: 2898 + OX, y: 500 + OY }
    ]
  },

  // 16C. Right Wooden Log Bunker Base Floor & Front Lip
  {
    id: 'right_bunker_floor',
    material: 'wood',
    noGrass: true,
    vertices: [
      { x: 2710 + OX, y: 568 + OY },
      { x: 2755 + OX, y: 568 + OY },
      { x: 2785 + OX, y: 602 + OY },
      { x: 3015 + OX, y: 602 + OY },
      { x: 3015 + OX, y: 665 + OY },
      { x: 2710 + OX, y: 665 + OY }
    ]
  },

  // ==================== NEW EXPANDED TERRAIN & STRUCTURES ====================

  // 17. Western High Sky Island
  {
    id: 'west_sky_island',
    material: 'earth',
    vertices: [
      { x: 145, y: 235 },
      { x: 265, y: 215 },
      { x: 385, y: 240 },
      { x: 365, y: 315 },
      { x: 275, y: 348 },
      { x: 175, y: 320 }
    ]
  },

  // 18A. Western Watchtower Roof
  {
    id: 'west_watchtower_roof',
    material: 'wood',
    noGrass: true,
    vertices: [
      { x: 110, y: 482 },
      { x: 365, y: 482 },
      { x: 365, y: 530 },
      { x: 110, y: 530 }
    ]
  },

  // 18B. Western Watchtower Back Wall & Floor
  {
    id: 'west_watchtower_body',
    material: 'wood',
    noGrass: true,
    vertices: [
      { x: 110, y: 530 },
      { x: 152, y: 530 },
      { x: 152, y: 632 },
      { x: 315, y: 632 },
      { x: 340, y: 602 },
      { x: 365, y: 602 },
      { x: 365, y: 682 },
      { x: 110, y: 682 }
    ]
  },

  // 19. Western Cliff Outcrop (Supporting Western Watchtower)
  {
    id: 'west_cliff_outcrop',
    material: 'earth',
    vertices: [
      { x: 75, y: 682 },
      { x: 365, y: 682 },
      { x: 475, y: 715 },
      { x: 455, y: 790 },
      { x: 345, y: 830 },
      { x: 215, y: 815 },
      { x: 95, y: 775 }
    ]
  },

  // 20. Western Lower Canyon Ledge
  {
    id: 'west_lower_canyon',
    material: 'earth',
    vertices: [
      { x: 85, y: 985 },
      { x: 245, y: 980 },
      { x: 385, y: 940 },
      { x: 485, y: 905 },
      { x: 495, y: 995 },
      { x: 390, y: 1085 },
      { x: 230, y: 1105 },
      { x: 95, y: 1065 }
    ]
  },

  // 21. High-Altitude Central Sky Mesa
  {
    id: 'high_center_mesa',
    material: 'earth',
    vertices: [
      { x: 1935, y: 168 },
      { x: 2085, y: 155 },
      { x: 2235, y: 172 },
      { x: 2210, y: 248 },
      { x: 2095, y: 278 },
      { x: 1965, y: 252 }
    ]
  },

  // 22. High-East Ridge Island
  {
    id: 'high_east_ridge',
    material: 'earth',
    vertices: [
      { x: 3480, y: 205 },
      { x: 3630, y: 175 },
      { x: 3775, y: 210 },
      { x: 3745, y: 288 },
      { x: 3620, y: 315 },
      { x: 3510, y: 278 }
    ]
  },

  // 23. East Floating Archway Island
  {
    id: 'east_floating_arch',
    material: 'earth',
    vertices: [
      { x: 3590, y: 488 },
      { x: 3725, y: 455 },
      { x: 3855, y: 485 },
      { x: 3830, y: 565 },
      { x: 3715, y: 595 },
      { x: 3610, y: 558 }
    ]
  },

  // 24. Far-East Continent & Stepped Trench
  {
    id: 'east_stepped_continent',
    material: 'earth',
    vertices: [
      { x: 3610, y: 825 },
      { x: 3735, y: 825 },
      { x: 3810, y: 765 },
      { x: 3960, y: 762 },
      { x: 4250, y: 762 },
      { x: 4320, y: 768 },
      { x: 4315, y: 920 },
      { x: 4240, y: 1055 },
      { x: 4080, y: 1120 },
      { x: 3880, y: 1095 },
      { x: 3710, y: 1045 },
      { x: 3605, y: 945 }
    ]
  },

  // 25A. Far-East Concrete Pillbox Roof
  {
    id: 'east_pillbox_roof',
    material: 'metal',
    noGrass: true,
    vertices: [
      { x: 3960, y: 538 },
      { x: 4250, y: 538 },
      { x: 4250, y: 622 },
      { x: 4010, y: 622 },
      { x: 3960, y: 636 }
    ]
  },

  // 25B. Far-East Concrete Pillbox Back Wall & Floor
  {
    id: 'east_pillbox_body',
    material: 'metal',
    noGrass: true,
    vertices: [
      { x: 4202, y: 622 },
      { x: 4250, y: 622 },
      { x: 4250, y: 762 },
      { x: 3960, y: 762 },
      { x: 3960, y: 702 },
      { x: 3995, y: 686 },
      { x: 4025, y: 708 },
      { x: 4202, y: 708 }
    ]
  },

  // 26. Deep Subterranean Central Stone Bridge
  {
    id: 'deep_cavern_bridge',
    material: 'earth',
    noGrass: true,
    vertices: [
      { x: 1580, y: 1285 },
      { x: 1850, y: 1275 },
      { x: 2140, y: 1285 },
      { x: 2115, y: 1355 },
      { x: 1850, y: 1372 },
      { x: 1605, y: 1350 }
    ]
  },

  // 27A. Deep Subterranean West Bedrock Shelf (Borders Western & Central Abyss)
  {
    id: 'deep_cavern_bedrock_west',
    material: 'earth',
    noGrass: true,
    vertices: [
      { x: 860, y: 1380 },
      { x: 1020, y: 1445 },
      { x: 1380, y: 1455 },
      { x: 1680, y: 1465 },
      { x: 1665, y: 1565 },
      { x: 1350, y: 1575 },
      { x: 960, y: 1550 },
      { x: 845, y: 1475 }
    ]
  },

  // 27B. Deep Subterranean East Bedrock Shelf (Borders Central & Eastern Abyss)
  {
    id: 'deep_cavern_bedrock_east',
    material: 'earth',
    noGrass: true,
    vertices: [
      { x: 1960, y: 1465 },
      { x: 2260, y: 1465 },
      { x: 2640, y: 1450 },
      { x: 2980, y: 1420 },
      { x: 3160, y: 1340 },
      { x: 3175, y: 1465 },
      { x: 2990, y: 1555 },
      { x: 2560, y: 1580 },
      { x: 1980, y: 1575 }
    ]
  }
];

// Decorative embedded wall bushes
export const DECORATIVE_BUSHES = [
  { x: 472 + OX, y: 448 + OY, scale: 1.0 },
  { x: 245 + OX, y: 805 + OY, scale: 1.0 },
  { x: 1668 + OX, y: 468 + OY, scale: 1.0 },
  { x: 2110 + OX, y: 242 + OY, scale: 0.9 },
  { x: 1712 + OX, y: 785 + OY, scale: 1.05 },
  { x: 2895 + OX, y: 755 + OY, scale: 1.0 },
  { x: 245, y: 740, scale: 1.0 },
  { x: 2080, y: 215, scale: 0.95 },
  { x: 3920, y: 865, scale: 1.05 }
];

// Foreground Stealth Bushes where players can hide (conceals soldier + nametag)
export const STEALTH_BUSHES = [
  { id: 'bush_0', x: 560, y: 650, radius: 44, foliageCount: 7, seed: 101 },
  { id: 'bush_1', x: 1090, y: 775, radius: 46, foliageCount: 8, seed: 202 },
  { id: 'bush_2', x: 1715, y: 515, radius: 45, foliageCount: 7, seed: 303 },
  { id: 'bush_3', x: 2180, y: 452, radius: 48, foliageCount: 8, seed: 404 },
  { id: 'bush_4', x: 2830, y: 515, radius: 45, foliageCount: 7, seed: 505 },
  { id: 'bush_5', x: 2990, y: 765, radius: 46, foliageCount: 8, seed: 606 },
  { id: 'bush_6', x: 1560, y: 970, radius: 44, foliageCount: 7, seed: 707 },
  { id: 'bush_7', x: 3790, y: 830, radius: 46, foliageCount: 8, seed: 808 }
];

// Safe Player Spawn Points across the Expanded 4400x1650 Outpost Map
export const SPAWN_POINTS = [
  { x: 235, y: 610, name: 'Western Watchtower' },
  { x: 450 + OX, y: 315 + OY, name: 'Left Bunker Interior' },
  { x: 235 + OX, y: 700 + OY, name: 'Lower Left Cavern' },
  { x: 1145 + OX, y: 435 + OY, name: 'Middle Left Island' },
  { x: 1238 + OX, y: 145 + OY, name: 'Upper Diamond Peak' },
  { x: 2085, y: 125, name: 'High Sky Mesa' },
  { x: 1610 + OX, y: 370 + OY, name: 'Center Ski-Jump' },
  { x: 2150 + OX, y: 145 + OY, name: 'Upper Right Sniper Perch' },
  { x: 2260 + OX, y: 435 + OY, name: 'Middle Right Island' },
  { x: 2420 + OX, y: 685 + OY, name: 'Right Valley Floor' },
  { x: 2860 + OX, y: 560 + OY, name: 'Right Log Bunker' },
  { x: 4100, y: 675, name: 'East Concrete Pillbox' },
  { x: 740 + OX, y: 890 + OY, name: 'Underground Tunnel West' },
  { x: 1850, y: 1240, name: 'Deep Subterranean Bridge' },
  { x: 2150, y: 1425, name: 'Deep Bedrock Cavern' }
];

// Ground Weapons & Military Resource Pickups (Lying naturally on the ground surface without glowing)
export const MAP_WEAPON_PADS = [
  {
    id: 0,
    x: 455 + OX,
    y: 352 + OY,
    weaponId: WEAPON_IDS.M249,
    label: 'M249 SAW'
  },
  {
    id: 1,
    x: 2865 + OX,
    y: 602 + OY,
    weaponId: WEAPON_IDS.M249,
    label: 'M249 SAW'
  },
  {
    id: 2,
    x: 2155 + OX,
    y: 186 + OY,
    weaponId: WEAPON_IDS.SNIPER,
    label: 'AWP SNIPER'
  },
  {
    id: 3,
    x: 465 + OX,
    y: 118 + OY,
    weaponId: WEAPON_IDS.SNIPER,
    label: 'AWP SNIPER'
  },
  {
    id: 4,
    x: 1625 + OX,
    y: 413 + OY,
    weaponId: WEAPON_IDS.RPG,
    label: 'RPG-7'
  },
  {
    id: 5,
    x: 820 + OX,
    y: 930 + OY,
    weaponId: WEAPON_IDS.SHOTGUN,
    label: 'SPAS-12'
  },
  {
    id: 6,
    x: 1145 + OX,
    y: 478 + OY,
    weaponId: WEAPON_IDS.SHOTGUN,
    label: 'SPAS-12'
  },
  {
    id: 7,
    x: 2400 + OX,
    y: 725 + OY,
    weaponId: WEAPON_IDS.RPG,
    label: 'RPG-7'
  },
  // New Expanded Area Weapons & Natural Ground Resource Packs
  {
    id: 8,
    x: 235,
    y: 632,
    weaponId: WEAPON_IDS.SNIPER,
    label: 'AWP SNIPER'
  },
  {
    id: 9,
    x: 4100,
    y: 708,
    weaponId: WEAPON_IDS.M249,
    label: 'M249 SAW'
  },
  {
    id: 10,
    x: 2085,
    y: 158,
    weaponId: WEAPON_IDS.RPG,
    label: 'RPG-7'
  },
  {
    id: 11,
    x: 1850,
    y: 1276,
    weaponId: WEAPON_IDS.M249,
    label: 'M249 SAW'
  },
  {
    id: 12,
    x: 280 + OX,
    y: 740 + OY,
    weaponId: RESOURCE_IDS.GRENADE_CRATE,
    label: 'FRAG CRATE'
  },
  {
    id: 13,
    x: 2020 + OX,
    y: 662 + OY,
    weaponId: RESOURCE_IDS.AMMO_CRATE,
    label: 'AMMO BOX'
  },
  {
    id: 14,
    x: 1280 + OX,
    y: 718 + OY,
    weaponId: RESOURCE_IDS.MEDKIT_PACK,
    label: 'MEDKIT'
  },
  {
    id: 15,
    x: 2050,
    y: 1465,
    weaponId: RESOURCE_IDS.GRENADE_CRATE,
    label: 'FRAG CRATE'
  },
  {
    id: 16,
    x: 3700,
    y: 825,
    weaponId: RESOURCE_IDS.MEDKIT_PACK,
    label: 'MEDKIT'
  },
  // RARE FLAMETHROWER SPAWN (Only 1 on map, 40s rare respawn timer)
  {
    id: 17,
    x: 1238 + OX,
    y: 174 + OY,
    weaponId: WEAPON_IDS.FLAMETHROWER,
    label: '★ FLAMETHROWER (RARE)',
    respawnTime: 40.0
  },
  // M7 TOXIC GAS & PROXY MINE CRATES
  {
    id: 18,
    x: 2260 + OX,
    y: 472 + OY,
    weaponId: RESOURCE_IDS.GAS_CRATE,
    label: 'M7 GAS CRATE'
  },
  {
    id: 19,
    x: 1450 + OX,
    y: 938 + OY,
    weaponId: RESOURCE_IDS.MINE_CRATE,
    label: 'PROXY MINE CRATE'
  }
];

export function buildCompiledMap() {
  const polygons = [];
  const allEdges = [];

  for (const raw of RAW_COLLISION_POLYGONS) {
    const verts = raw.vertices.map(v => ({ x: v.x, y: v.y }));
    const n = verts.length;

    let signedArea = 0;
    for (let i = 0; i < n; i++) {
      const curr = verts[i];
      const next = verts[(i + 1) % n];
      signedArea += (curr.x * next.y - next.x * curr.y);
    }

    if (signedArea < 0) {
      verts.reverse();
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const edges = [];

    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      if (a.x < minX) minX = a.x;
      if (a.y < minY) minY = a.y;
      if (a.x > maxX) maxX = a.x;
      if (a.y > maxY) maxY = a.y;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) continue;

      const nx = dy / len;
      const ny = -dx / len;

      const underLeftBunker = raw.id === 'upper_left_cliff' && a.x >= 305 + OX && b.x <= 620 + OX && Math.abs(a.y - (408 + OY)) < 6;
      const underRightBunker = raw.id === 'right_main_continent' && a.x >= 2705 + OX && b.x <= 3020 + OX && Math.abs(a.y - (665 + OY)) < 6;
      const underWestTower = raw.id === 'west_cliff_outcrop' && a.x >= 105 && b.x <= 370 && Math.abs(a.y - 682) < 6;
      const underEastPillbox = raw.id === 'east_stepped_continent' && a.x >= 3955 && b.x <= 4255 && Math.abs(a.y - 762) < 6;

      const isGrassEdge = !raw.noGrass && ny < -0.48 && !underLeftBunker && !underRightBunker && !underWestTower && !underEastPillbox;

      const edge = {
        polyId: raw.id,
        material: raw.material,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
        dx,
        dy,
        len,
        nx,
        ny,
        isGrassEdge,
        minX: Math.min(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxX: Math.max(a.x, b.x),
        maxY: Math.max(a.y, b.y)
      };

      edges.push(edge);
      allEdges.push(edge);
    }

    polygons.push({
      id: raw.id,
      material: raw.material,
      noGrass: !!raw.noGrass,
      vertices: verts,
      edges,
      minX,
      minY,
      maxX,
      maxY
    });
  }

  return {
    polygons,
    allEdges,
    backgroundPolygons: BACKGROUND_POLYGONS,
    bushes: DECORATIVE_BUSHES,
    stealthBushes: STEALTH_BUSHES,
    spawnPoints: SPAWN_POINTS,
    weaponPads: MAP_WEAPON_PADS
  };
}

export const COMPILED_MAP = buildCompiledMap();

