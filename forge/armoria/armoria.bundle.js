var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// .armoria-build/dataModel.js
var require_dataModel = __commonJS({
  ".armoria-build/dataModel.js"(exports, module) {
    var tinctures = {
      field: { metals: 32, colours: 49, stains: 1, patterns: 14 },
      division: { metals: 35, colours: 49, stains: 1, patterns: 8 },
      charge: { metals: 16, colours: 24, stains: 1, patterns: 0 },
      metals: { argent: 3, or: 2 },
      colours: { gules: 5, azure: 4, sable: 3, purpure: 3, vert: 2 },
      stains: { murrey: 1, sanguine: 1, tenn\u00E9: 1 },
      patterns: {
        semy: 8,
        ermine: 6,
        vair: 4,
        counterVair: 1,
        vairInPale: 1,
        vairEnPointe: 2,
        vairAncien: 2,
        potent: 2,
        counterPotent: 1,
        potentInPale: 1,
        potentEnPointe: 1,
        chequy: 8,
        lozengy: 5,
        fusily: 2,
        pally: 8,
        barry: 10,
        gemelles: 1,
        bendy: 8,
        bendySinister: 4,
        palyBendy: 2,
        barryBendy: 1,
        pappellony: 2,
        pappellony2: 3,
        scaly: 1,
        plumetty: 1,
        masoned: 6,
        fretty: 3,
        grillage: 1,
        chainy: 1,
        maily: 2,
        honeycombed: 1
      }
    };
    var colors = {
      argent: "#fafafa",
      or: "#ffe066",
      gules: "#d7374a",
      sable: "#333333",
      azure: "#377cd7",
      vert: "#26c061",
      purpure: "#522d5b",
      murrey: "#85185b",
      sanguine: "#b63a3a",
      tenn\u00E9: "#cc7f19"
    };
    var shields = {
      types: { basic: 10, regional: 2, historical: 1, specific: 1, banner: 1, simple: 2, fantasy: 1, middleEarth: 0 },
      basic: { heater: 12, spanish: 6, french: 1 },
      regional: { horsehead: 1, horsehead2: 1, polish: 1, hessen: 1, swiss: 1 },
      historical: { boeotian: 1, roman: 2, kite: 1, oldFrench: 5, renaissance: 2, baroque: 2 },
      specific: { targe: 1, targe2: 0, pavise: 5, wedged: 10 },
      banner: { flag: 1, pennon: 0, guidon: 0, banner: 0, dovetail: 1, gonfalon: 5, pennant: 0 },
      simple: { round: 12, oval: 6, vesicaPiscis: 1, square: 1, diamond: 2, no: 0 },
      middleEarth: { noldor: 1, gondor: 1, easterling: 1, erebor: 1, ironHills: 1, urukHai: 1, moriaOrc: 1 },
      fantasy: { fantasy1: 2, fantasy2: 2, fantasy3: 1, fantasy4: 1, fantasy5: 3 }
    };
    var positions = {
      conventional: {
        e: 20,
        abcdefgzi: 3,
        beh: 3,
        behdf: 2,
        acegi: 1,
        kn: 3,
        bhdf: 1,
        jeo: 1,
        abc: 3,
        jln: 6,
        jlh: 3,
        kmo: 2,
        jleh: 1,
        def: 3,
        abcpqh: 4,
        ABCDEFGHIJKL: 1
      },
      complex: { e: 40, beh: 1, kn: 1, jeo: 1, abc: 2, jln: 7, jlh: 2, def: 1, abcpqh: 1 },
      divisions: {
        perPale: { e: 15, pq: 5, jo: 2, jl: 2, ABCDEFGHIJKL: 1 },
        perFess: { e: 12, kn: 4, jkl: 2, gizgiz: 1, jlh: 3, kmo: 1, ABCDEFGHIJKL: 1 },
        perBend: { e: 5, lm: 5, bcfdgh: 1 },
        perBendSinister: { e: 1, jo: 1 },
        perCross: { e: 4, jlmo: 1, j: 1, jo: 2, jl: 1 },
        perChevron: { e: 1, jlh: 1, dfk: 1, dfbh: 2, bdefh: 1 },
        perChevronReversed: { e: 1, mok: 2, dfh: 2, dfbh: 1, bdefh: 1 },
        perSaltire: { bhdf: 8, e: 3, abcdefgzi: 1, bh: 1, df: 1, ABCDEFGHIJKL: 1 },
        perPile: { ee: 3, be: 2, abceh: 1, abcabc: 1, jleh: 1 }
      },
      inescutcheon: { e: 4, jln: 1 }
    };
    var lines = {
      straight: 50,
      wavy: 8,
      engrailed: 4,
      invecked: 3,
      rayonne: 3,
      embattled: 1,
      raguly: 1,
      urdy: 1,
      dancetty: 1,
      indented: 2,
      dentilly: 1,
      bevilled: 1,
      angled: 1,
      flechy: 1,
      barby: 1,
      enclavy: 1,
      escartely: 1,
      arched: 2,
      archedReversed: 1,
      nowy: 1,
      nowyReversed: 1,
      embattledGhibellin: 1,
      embattledNotched: 1,
      embattledGrady: 1,
      dovetailedIndented: 1,
      dovetailed: 1,
      potenty: 1,
      potentyDexter: 1,
      potentySinister: 1,
      nebuly: 2,
      seaWaves: 1,
      dragonTeeth: 1,
      firTrees: 1
    };
    var divisions = {
      variants: {
        perPale: 5,
        perFess: 5,
        perBend: 2,
        perBendSinister: 1,
        perChevron: 1,
        perChevronReversed: 1,
        perCross: 5,
        perPile: 1,
        perSaltire: 1,
        gyronny: 1,
        chevronny: 1
      },
      perPale: lines,
      perFess: lines,
      perBend: lines,
      perBendSinister: lines,
      perChevron: lines,
      perChevronReversed: lines,
      perCross: {
        straight: 20,
        wavy: 5,
        engrailed: 4,
        invecked: 3,
        rayonne: 1,
        embattled: 1,
        raguly: 1,
        urdy: 1,
        indented: 2,
        dentilly: 1,
        bevilled: 1,
        angled: 1,
        embattledGhibellin: 1,
        embattledGrady: 1,
        dovetailedIndented: 1,
        dovetailed: 1,
        potenty: 1,
        potentyDexter: 1,
        potentySinister: 1,
        nebuly: 1
      },
      perPile: lines
    };
    var ordinaries = {
      lined: {
        pale: 7,
        fess: 5,
        bend: 3,
        bendSinister: 2,
        chief: 5,
        bar: 2,
        gemelle: 1,
        fessCotissed: 1,
        fessDoubleCotissed: 1,
        bendlet: 2,
        bendletSinister: 1,
        terrace: 3,
        cross: 6,
        crossParted: 1,
        saltire: 2,
        saltireParted: 1
      },
      straight: {
        bordure: 8,
        orle: 4,
        mount: 1,
        point: 2,
        flaunches: 1,
        gore: 1,
        gyron: 1,
        quarter: 1,
        canton: 2,
        pall: 3,
        pallReversed: 2,
        chevron: 4,
        chevronReversed: 3,
        pile: 2,
        pileInBend: 2,
        pileInBendSinister: 1,
        piles: 1,
        pilesInPoint: 2,
        label: 1
      },
      data: {
        bar: {
          positionsOn: { defdefdef: 1 },
          positionsOff: { abc: 2, abcgzi: 1, jlh: 5, bgi: 2, ach: 1 }
        },
        bend: {
          positionsOn: { ee: 2, jo: 1, joe: 1 },
          positionsOff: { ccg: 2, ccc: 1 }
        },
        bendSinister: {
          positionsOn: { ee: 1, lm: 1, lem: 4 },
          positionsOff: { aai: 2, aaa: 1 }
        },
        bendlet: {
          positionsOn: { joejoejoe: 1 },
          positionsOff: { ccg: 2, ccc: 1 }
        },
        bendletSinister: {
          positionsOn: { lemlemlem: 1 },
          positionsOff: { aai: 2, aaa: 1 }
        },
        bordure: {
          positionsOn: { ABCDEFGHIJKL: 1 },
          positionsOff: { e: 4, jleh: 2, kenken: 1, peqpeq: 1 }
        },
        canton: {
          positionsOn: { yyyy: 1 },
          positionsOff: { e: 5, beh: 1, def: 1, bdefh: 1, kn: 1 }
        },
        chevron: {
          positionsOn: { ach: 3, hhh: 1 }
        },
        chevronReversed: {
          positionsOff: { bbb: 1 }
        },
        chief: {
          positionsOn: { abc: 5, bbb: 1 },
          positionsOff: { emo: 2, emoz: 1, ez: 2 }
        },
        cross: {
          positionsOn: { eeee: 1, behdfbehdf: 3, behbehbeh: 2 },
          positionsOff: { acgi: 1 }
        },
        crossParted: {
          positionsOn: { e: 5, ee: 1 }
        },
        fess: {
          positionsOn: { ee: 1, def: 3 },
          positionsOff: { abc: 3, abcz: 1 }
        },
        fessCotissed: {
          positionsOn: { ee: 1, def: 3 }
        },
        fessDoubleCotissed: {
          positionsOn: { ee: 1, defdef: 3 }
        },
        flaunches: {
          positionsOff: { e: 3, kn: 1, beh: 3 }
        },
        gemelle: {
          positionsOff: { abc: 1 }
        },
        gyron: {
          positionsOff: { bh: 1 }
        },
        label: {
          positionsOff: { defgzi: 2, eh: 3, defdefhmo: 1, egiegi: 1, pqn: 5 }
        },
        mount: {
          positionsOff: { e: 5, def: 1, bdf: 3 }
        },
        orle: {
          positionsOff: { e: 4, jleh: 1, kenken: 1, peqpeq: 1 }
        },
        pale: {
          positionsOn: { ee: 12, beh: 10, kn: 3, bb: 1 },
          positionsOff: { yyy: 1 }
        },
        pall: {
          positionsOn: { ee: 1, jleh: 5, jlhh: 3 },
          positionsOff: { BCKFEILGJbdmfo: 1 }
        },
        pallReversed: {
          positionsOn: { ee: 1, bemo: 5 },
          positionsOff: { aczac: 1 }
        },
        pile: {
          positionsOn: { bbb: 1 },
          positionsOff: { acdfgi: 1, acac: 1 }
        },
        pileInBend: {
          positionsOn: { eeee: 1, eeoo: 1 },
          positionsOff: { cg: 1 }
        },
        pileInBendSinister: {
          positionsOn: { eeee: 1, eemm: 1 },
          positionsOff: { ai: 1 }
        },
        point: {
          positionsOff: { e: 2, def: 1, bdf: 3, acbdef: 1 }
        },
        quarter: {
          positionsOn: { jjj: 1 },
          positionsOff: { e: 1 }
        },
        saltire: {
          positionsOn: { ee: 5, jlemo: 1 }
        },
        saltireParted: {
          positionsOn: { e: 5, ee: 1 }
        },
        terrace: {
          positionsOff: { e: 5, def: 1, bdf: 3 }
        }
      }
    };
    var chargeData = {
      agnusDei: {
        colors: 2,
        sinister: true
      },
      angel: {
        colors: 2,
        positions: { e: 1 }
      },
      anvil: {
        sinister: true
      },
      apple: {
        colors: 2
      },
      arbalest: {
        colors: 3,
        reversed: true
      },
      archer: {
        colors: 3,
        sinister: true
      },
      armEmbowedHoldingSabre: {
        colors: 3,
        sinister: true
      },
      armEmbowedVambraced: {
        sinister: true
      },
      armEmbowedVambracedHoldingSword: {
        colors: 3,
        sinister: true
      },
      armillarySphere: {
        positions: { e: 1 }
      },
      arrow: {
        colors: 3,
        reversed: true
      },
      arrowsSheaf: {
        colors: 3,
        reversed: true
      },
      axe: {
        colors: 2,
        sinister: true
      },
      badgerStatant: {
        colors: 2,
        sinister: true
      },
      banner: {
        colors: 2
      },
      basilisk: {
        colors: 3,
        sinister: true
      },
      bearPassant: {
        colors: 3,
        sinister: true
      },
      bearRampant: {
        colors: 3,
        sinister: true
      },
      bee: {
        colors: 3,
        reversed: true
      },
      bell: {
        colors: 2
      },
      boarHeadErased: {
        colors: 3,
        sinister: true
      },
      boarRampant: {
        colors: 3,
        sinister: true,
        positions: { e: 12, beh: 1, kn: 1, jln: 2 }
      },
      boat: {
        colors: 2
      },
      bookClosed: {
        colors: 3,
        sinister: true
      },
      bookClosed2: {
        sinister: true
      },
      bookOpen: {
        colors: 3
      },
      bow: {
        sinister: true
      },
      bowWithArrow: {
        colors: 3,
        reversed: true
      },
      bowWithThreeArrows: {
        colors: 3
      },
      bucket: {
        colors: 2
      },
      bugleHorn: {
        colors: 2
      },
      bugleHorn2: {
        colors: 2
      },
      bullHeadCaboshed: {
        colors: 2
      },
      bullPassant: {
        colors: 3,
        sinister: true
      },
      butterfly: {
        colors: 3,
        reversed: true
      },
      camel: {
        colors: 2,
        sinister: true
      },
      cancer: {
        reversed: true
      },
      cannon: {
        colors: 2,
        sinister: true
      },
      caravel: {
        colors: 3,
        sinister: true
      },
      castle: {
        colors: 2
      },
      castle2: {
        colors: 3
      },
      catPassantGuardant: {
        colors: 2,
        sinister: true
      },
      cavalier: {
        colors: 3,
        sinister: true,
        positions: { e: 1 }
      },
      centaur: {
        colors: 3,
        sinister: true
      },
      chalice: {
        colors: 2
      },
      cinquefoil: {
        reversed: true
      },
      cock: {
        colors: 3,
        sinister: true
      },
      comet: {
        reversed: true
      },
      cowStatant: {
        colors: 3,
        sinister: true
      },
      cossack: {
        colors: 3,
        sinister: true
      },
      crescent: {
        reversed: true
      },
      crocodile: {
        colors: 2,
        sinister: true
      },
      crosier: {
        sinister: true
      },
      crossbow: {
        colors: 3,
        sinister: true
      },
      crossGamma: {
        sinister: true
      },
      crossLatin: {
        reversed: true
      },
      crossTau: {
        reversed: true
      },
      crossTriquetra: {
        reversed: true
      },
      crown: {
        colors: 2,
        positions: {
          e: 10,
          abcdefgzi: 1,
          beh: 3,
          behdf: 2,
          acegi: 1,
          kn: 1,
          pq: 2,
          abc: 1,
          jln: 4,
          jleh: 1,
          def: 2,
          abcpqh: 3
        }
      },
      crown2: {
        colors: 3,
        positions: {
          e: 10,
          abcdefgzi: 1,
          beh: 3,
          behdf: 2,
          acegi: 1,
          kn: 1,
          pq: 2,
          abc: 1,
          jln: 4,
          jleh: 1,
          def: 2,
          abcpqh: 3
        }
      },
      deerHeadCaboshed: {
        colors: 2
      },
      dolphin: {
        colors: 2,
        sinister: true
      },
      donkeyHeadCaboshed: {
        colors: 2
      },
      dove: {
        colors: 2,
        natural: "argent",
        sinister: true
      },
      doveDisplayed: {
        colors: 2,
        natural: "argent",
        sinister: true
      },
      dragonfly: {
        colors: 2,
        reversed: true
      },
      dragonPassant: {
        colors: 3,
        sinister: true
      },
      dragonRampant: {
        colors: 3,
        sinister: true
      },
      drakkar: {
        colors: 3,
        sinister: true
      },
      drawingCompass: {
        sinister: true
      },
      drum: {
        colors: 3
      },
      duck: {
        colors: 3,
        sinister: true
      },
      eagle: {
        colors: 3,
        sinister: true,
        positions: { e: 15, beh: 1, kn: 1, abc: 1, jlh: 2, def: 2, pq: 1 }
      },
      eagleTwoHeads: {
        colors: 3
      },
      elephant: {
        colors: 2,
        sinister: true
      },
      elephantHeadErased: {
        colors: 2,
        sinister: true
      },
      falchion: {
        colors: 2,
        reversed: true
      },
      falcon: {
        colors: 3,
        sinister: true
      },
      fan: {
        colors: 2,
        reversed: true
      },
      fasces: {
        colors: 3,
        sinister: true
      },
      feather: {
        sinister: true
      },
      flamberge: {
        colors: 2,
        reversed: true
      },
      flangedMace: {
        reversed: true
      },
      fly: {
        colors: 3,
        reversed: true
      },
      foot: {
        sinister: true
      },
      fountain: {
        natural: "azure"
      },
      frog: {
        reversed: true
      },
      garb: {
        colors: 2,
        natural: "or",
        positions: { e: 1, def: 3, abc: 2, beh: 1, kn: 1, jln: 3, jleh: 1, abcpqh: 1, joe: 1, lme: 1 }
      },
      gauntlet: {
        sinister: true,
        reversed: true
      },
      goat: {
        colors: 3,
        sinister: true
      },
      goutte: {
        reversed: true
      },
      grapeBunch: {
        colors: 3,
        sinister: true
      },
      grapeBunch2: {
        colors: 3,
        sinister: true
      },
      grenade: {
        colors: 2
      },
      greyhoundCourant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 1, abc: 1, bdefh: 1, jlh: 1, abcpqh: 1 }
      },
      greyhoundRampant: {
        colors: 2,
        sinister: true,
        positions: { e: 10, def: 1, abc: 1, bdefh: 1, jlh: 1, abcpqh: 1 }
      },
      greyhoundSejant: {
        colors: 3,
        sinister: true
      },
      griffinPassant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 2, abc: 2, bdefh: 1, kn: 1, jlh: 2, abcpqh: 1 }
      },
      griffinRampant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 1, abc: 1, bdefh: 1, jlh: 1, abcpqh: 1 }
      },
      hand: {
        sinister: true,
        reversed: true,
        positions: { e: 10, jln: 2, kn: 1, jeo: 1, abc: 2, pqe: 1 }
      },
      harp: {
        colors: 2,
        sinister: true
      },
      hatchet: {
        colors: 2,
        sinister: true
      },
      head: {
        colors: 2,
        sinister: true,
        positions: { e: 1 }
      },
      headWreathed: {
        colors: 3,
        sinister: true,
        positions: { e: 1 }
      },
      hedgehog: {
        colors: 3,
        sinister: true
      },
      helmet: {
        sinister: true
      },
      helmetCorinthian: {
        colors: 3,
        sinister: true
      },
      helmetGreat: {
        sinister: true
      },
      helmetZischagge: {
        sinister: true
      },
      heron: {
        colors: 2,
        sinister: true
      },
      hindStatant: {
        colors: 2,
        sinister: true
      },
      hook: {
        sinister: true
      },
      horseHeadCouped: {
        sinister: true
      },
      horsePassant: {
        colors: 2,
        sinister: true
      },
      horseRampant: {
        colors: 3,
        sinister: true
      },
      horseSalient: {
        colors: 2,
        sinister: true
      },
      horseshoe: {
        reversed: true
      },
      hourglass: {
        colors: 3
      },
      ladybird: {
        colors: 3,
        reversed: true
      },
      lamb: {
        colors: 2,
        sinister: true
      },
      lambPassantReguardant: {
        colors: 2,
        sinister: true
      },
      lanceWithBanner: {
        colors: 3,
        sinister: true
      },
      laurelWreath: {
        colors: 2
      },
      lighthouse: {
        colors: 3
      },
      lionHeadCaboshed: {
        colors: 2
      },
      lionHeadErased: {
        colors: 2,
        sinister: true
      },
      lionPassant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 1, abc: 1, bdefh: 1, jlh: 1, abcpqh: 1 }
      },
      lionPassantGuardant: {
        colors: 3,
        sinister: true
      },
      lionRampant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 2, abc: 2, bdefh: 1, kn: 1, jlh: 2, abcpqh: 1 }
      },
      lionSejant: {
        colors: 3,
        sinister: true
      },
      lizard: {
        reversed: true
      },
      lochaberAxe: {
        colors: 2,
        sinister: true
      },
      log: {
        sinister: true
      },
      lute: {
        colors: 2,
        sinister: true
      },
      lymphad: {
        colors: 3,
        sinister: true,
        positions: { e: 1 }
      },
      mace: {
        colors: 2
      },
      maces: {
        colors: 2
      },
      mallet: {
        colors: 2
      },
      mantle: {
        colors: 3
      },
      martenCourant: {
        colors: 3,
        sinister: true
      },
      mascle: {
        positions: {
          e: 15,
          abcdefgzi: 3,
          beh: 3,
          bdefh: 4,
          acegi: 1,
          kn: 3,
          joe: 2,
          abc: 3,
          jlh: 8,
          jleh: 1,
          df: 3,
          abcpqh: 4,
          pqe: 3,
          eknpq: 3
        }
      },
      mastiffStatant: {
        colors: 3,
        sinister: true
      },
      mitre: {
        colors: 3
      },
      monk: {
        sinister: true
      },
      moonInCrescent: {
        sinister: true
      },
      mullet: {
        reversed: true
      },
      mullet7: {
        reversed: true
      },
      oak: {
        colors: 3
      },
      orb: {
        colors: 3
      },
      ouroboros: {
        sinister: true
      },
      owl: {
        colors: 2,
        sinister: true
      },
      owlDisplayed: {
        colors: 2
      },
      palmTree: {
        colors: 3
      },
      parrot: {
        colors: 2,
        sinister: true
      },
      peacock: {
        colors: 3,
        sinister: true
      },
      peacockInPride: {
        colors: 3,
        sinister: true
      },
      pear: {
        colors: 2
      },
      pegasus: {
        colors: 3,
        sinister: true
      },
      pike: {
        colors: 2,
        sinister: true
      },
      pineTree: {
        colors: 2
      },
      plaice: {
        colors: 2,
        sinister: true
      },
      plough: {
        colors: 2,
        sinister: true
      },
      ploughshare: {
        sinister: true
      },
      porcupine: {
        colors: 2,
        sinister: true
      },
      portcullis: {
        colors: 2
      },
      rabbitSejant: {
        colors: 2,
        sinister: true
      },
      rake: {
        reversed: true
      },
      rapier: {
        colors: 2,
        sinister: true,
        reversed: true
      },
      ramHeadErased: {
        colors: 3,
        sinister: true
      },
      ramPassant: {
        colors: 3,
        sinister: true
      },
      ratRampant: {
        colors: 2,
        sinister: true
      },
      raven: {
        colors: 2,
        natural: "sable",
        sinister: true,
        positions: { e: 15, beh: 1, kn: 1, jeo: 1, abc: 3, jln: 3, def: 1 }
      },
      rhinoceros: {
        colors: 2,
        sinister: true
      },
      rose: {
        colors: 3
      },
      sabre: {
        colors: 2,
        sinister: true
      },
      sabre2: {
        colors: 2,
        sinister: true,
        reversed: true
      },
      sabresCrossed: {
        colors: 2,
        reversed: true
      },
      sagittarius: {
        colors: 3,
        sinister: true
      },
      salmon: {
        colors: 2,
        sinister: true
      },
      saw: {
        colors: 2
      },
      scale: {
        colors: 2
      },
      scaleImbalanced: {
        colors: 2,
        sinister: true
      },
      scissors: {
        reversed: true
      },
      scorpion: {
        reversed: true
      },
      scrollClosed: {
        colors: 2,
        sinister: true
      },
      scythe: {
        colors: 2,
        sinister: true,
        reversed: true
      },
      scythe2: {
        sinister: true
      },
      serpent: {
        colors: 2,
        sinister: true
      },
      shield: {
        colors: 2,
        sinister: true
      },
      sickle: {
        colors: 2,
        sinister: true,
        reversed: true
      },
      snail: {
        colors: 2,
        sinister: true
      },
      snake: {
        colors: 2,
        sinister: true
      },
      spear: {
        colors: 2,
        reversed: true
      },
      spiral: {
        sinister: true,
        reversed: true
      },
      squirrel: {
        sinister: true
      },
      stagLodgedRegardant: {
        colors: 3,
        sinister: true
      },
      stagPassant: {
        colors: 2,
        sinister: true
      },
      stirrup: {
        colors: 2
      },
      swallow: {
        colors: 2,
        sinister: true
      },
      swan: {
        colors: 3,
        sinister: true
      },
      swanErased: {
        colors: 3,
        sinister: true
      },
      sword: {
        colors: 2,
        reversed: true
      },
      talbotPassant: {
        colors: 3,
        sinister: true
      },
      talbotSejant: {
        colors: 3,
        sinister: true
      },
      tower: {
        colors: 2
      },
      tree: {
        positions: { e: 1 }
      },
      trefoil: {
        reversed: true
      },
      trowel: {
        colors: 2,
        sinister: true,
        reversed: true
      },
      unicornRampant: {
        colors: 3,
        sinister: true
      },
      wasp: {
        colors: 3,
        reversed: true
      },
      wheatStalk: {
        colors: 2
      },
      windmill: {
        colors: 3,
        sinister: true
      },
      wing: {
        sinister: true
      },
      wingSword: {
        colors: 3,
        sinister: true
      },
      wolfHeadErased: {
        colors: 2,
        sinister: true
      },
      wolfPassant: {
        colors: 3,
        sinister: true,
        positions: { e: 10, def: 1, abc: 1, bdefh: 1, jlh: 1, abcpqh: 1 }
      },
      wolfRampant: {
        colors: 3,
        sinister: true
      },
      wolfStatant: {
        colors: 3,
        sinister: true
      },
      wyvern: {
        colors: 3,
        sinister: true,
        positions: { e: 10, jln: 1 }
      },
      wyvernWithWingsDisplayed: {
        colors: 3,
        sinister: true
      }
    };
    var charges = {
      types: {
        conventional: 33,
        // 40 charges
        crosses: 13,
        // 30 charges
        beasts: 7,
        // 41 charges
        beastHeads: 3,
        // 10 charges
        birds: 3,
        // 16 charges
        reptiles: 2,
        // 5 charges
        bugs: 2,
        // 8 charges
        fishes: 1,
        // 3 charges
        molluscs: 1,
        // 2 charges
        plants: 3,
        // 18 charges
        fantastic: 5,
        // 14 charges
        agriculture: 2,
        // 8 charges
        arms: 5,
        // 32 charges
        bodyparts: 2,
        // 12 charges
        people: 2,
        // 4 charges
        architecture: 3,
        // 11 charges
        seafaring: 3,
        // 9 charges
        tools: 3,
        // 15 charges
        miscellaneous: 5,
        // 30 charges
        inescutcheon: 3,
        // 43 charges
        ornaments: 0,
        // 9 charges
        uploaded: 0
      },
      single: {
        conventional: 10,
        crosses: 8,
        beasts: 7,
        beastHeads: 3,
        birds: 3,
        reptiles: 2,
        bugs: 2,
        fishes: 1,
        molluscs: 1,
        plants: 3,
        fantastic: 5,
        agriculture: 2,
        arms: 5,
        bodyparts: 2,
        people: 2,
        architecture: 3,
        seafaring: 3,
        tools: 3,
        miscellaneous: 5,
        inescutcheon: 1
      },
      semy: {
        conventional: 4,
        crosses: 1
      },
      conventional: {
        annulet: 4,
        billet: 5,
        carreau: 1,
        comet: 1,
        compassRose: 1,
        crescent: 5,
        delf: 0,
        estoile: 1,
        fleurDeLis: 6,
        fountain: 1,
        fusil: 4,
        gear: 1,
        goutte: 4,
        heart: 4,
        lozenge: 2,
        lozengeFaceted: 3,
        lozengePloye: 1,
        mascle: 4,
        moonInCrescent: 1,
        mullet: 5,
        mullet10: 1,
        mullet4: 3,
        mullet6: 4,
        mullet6Faceted: 1,
        mullet6Pierced: 1,
        mullet7: 1,
        mullet8: 1,
        mulletFaceted: 1,
        mulletPierced: 1,
        pique: 2,
        roundel: 4,
        roundel2: 3,
        rustre: 2,
        spiral: 1,
        sun: 3,
        sunInSplendour: 1,
        sunInSplendour2: 1,
        trefle: 2,
        triangle: 3,
        trianglePierced: 1
      },
      crosses: {
        crossHummetty: 15,
        crossVoided: 1,
        crossPattee: 2,
        crossPatteeAlisee: 1,
        crossFormee: 1,
        crossFormee2: 2,
        crossPotent: 2,
        crossJerusalem: 1,
        crosslet: 1,
        crossClechy: 3,
        crossBottony: 1,
        crossFleury: 3,
        crossPatonce: 1,
        crossPommy: 1,
        crossGamma: 1,
        crossArrowed: 1,
        crossFitchy: 1,
        crossCercelee: 1,
        crossMoline: 2,
        crossFourchy: 1,
        crossAvellane: 1,
        crossErminee: 1,
        crossBiparted: 1,
        crossMaltese: 3,
        crossTemplar: 2,
        crossCeltic: 1,
        crossCeltic2: 1,
        crossTriquetra: 1,
        crossCarolingian: 1,
        crossOccitan: 1,
        crossSaltire: 3,
        crossBurgundy: 1,
        crossLatin: 3,
        crossPatriarchal: 1,
        crossOrthodox: 1,
        crossCalvary: 1,
        crossDouble: 1,
        crossTau: 1,
        crossSantiago: 1,
        crossAnkh: 1
      },
      beasts: {
        agnusDei: 1,
        badgerStatant: 1,
        bearPassant: 1,
        bearRampant: 3,
        boarRampant: 1,
        bullPassant: 1,
        camel: 1,
        catPassantGuardant: 1,
        cowStatant: 1,
        dolphin: 1,
        elephant: 1,
        goat: 1,
        greyhoundCourant: 1,
        greyhoundRampant: 1,
        greyhoundSejant: 1,
        hedgehog: 1,
        hindStatant: 1,
        horsePassant: 1,
        horseRampant: 2,
        horseSalient: 1,
        lamb: 1,
        lambPassantReguardant: 1,
        lionPassant: 3,
        lionPassantGuardant: 2,
        lionRampant: 7,
        lionSejant: 2,
        martenCourant: 1,
        mastiffStatant: 1,
        porcupine: 1,
        rabbitSejant: 1,
        ramPassant: 1,
        ratRampant: 1,
        rhinoceros: 1,
        squirrel: 1,
        stagLodgedRegardant: 1,
        stagPassant: 1,
        talbotPassant: 1,
        talbotSejant: 1,
        wolfPassant: 1,
        wolfRampant: 1,
        wolfStatant: 1
      },
      beastHeads: {
        wolfHeadErased: 2,
        bullHeadCaboshed: 1,
        deerHeadCaboshed: 1,
        donkeyHeadCaboshed: 1,
        lionHeadCaboshed: 2,
        lionHeadErased: 2,
        boarHeadErased: 1,
        horseHeadCouped: 1,
        ramHeadErased: 1,
        elephantHeadErased: 1
      },
      birds: {
        eagle: 9,
        falcon: 2,
        raven: 2,
        cock: 3,
        parrot: 1,
        swan: 2,
        swanErased: 1,
        heron: 1,
        owl: 1,
        owlDisplayed: 1,
        dove: 2,
        doveDisplayed: 1,
        duck: 1,
        peacock: 1,
        peacockInPride: 1,
        swallow: 1
      },
      reptiles: {
        crocodile: 1,
        frog: 1,
        lizard: 1,
        ouroboros: 1,
        snake: 1
      },
      bugs: {
        bee: 1,
        butterfly: 1,
        cancer: 1,
        dragonfly: 1,
        fly: 1,
        ladybird: 1,
        scorpion: 1,
        wasp: 1
      },
      fishes: {
        pike: 1,
        plaice: 1,
        salmon: 1
      },
      molluscs: {
        escallop: 4,
        snail: 1
      },
      plants: {
        apple: 1,
        cinquefoil: 1,
        earOfWheat: 1,
        grapeBunch: 1,
        grapeBunch2: 1,
        mapleLeaf: 1,
        oak: 1,
        palmTree: 1,
        pear: 1,
        pineCone: 1,
        pineTree: 1,
        quatrefoil: 1,
        rose: 1,
        sextifoil: 1,
        thistle: 1,
        tree: 1,
        trefoil: 1,
        wheatStalk: 1
      },
      fantastic: {
        angel: 3,
        basilisk: 1,
        centaur: 1,
        dragonPassant: 3,
        dragonRampant: 2,
        eagleTwoHeads: 2,
        griffinPassant: 1,
        griffinRampant: 2,
        pegasus: 1,
        sagittarius: 1,
        serpent: 1,
        unicornRampant: 1,
        wyvern: 1,
        wyvernWithWingsDisplayed: 1
      },
      agriculture: {
        garb: 2,
        millstone: 1,
        plough: 1,
        ploughshare: 1,
        rake: 1,
        scythe: 1,
        scythe2: 1,
        sickle: 1
      },
      arms: {
        arbalest: 1,
        arbalest2: 1,
        arrow: 1,
        arrowsSheaf: 1,
        axe: 3,
        bow: 1,
        bowWithArrow: 2,
        bowWithThreeArrows: 1,
        cannon: 1,
        falchion: 1,
        flamberge: 1,
        flangedMace: 1,
        gauntlet: 1,
        grenade: 1,
        hatchet: 3,
        helmet: 2,
        helmetCorinthian: 1,
        helmetGreat: 2,
        helmetZischagge: 1,
        lanceHead: 1,
        lanceWithBanner: 1,
        lochaberAxe: 1,
        mace: 1,
        maces: 1,
        mallet: 1,
        rapier: 1,
        sabre: 1,
        sabre2: 1,
        sabresCrossed: 1,
        shield: 1,
        spear: 1,
        sword: 4
      },
      bodyparts: {
        armEmbowedHoldingSabre: 1,
        armEmbowedVambraced: 1,
        armEmbowedVambracedHoldingSword: 1,
        bone: 1,
        crossedBones: 2,
        foot: 1,
        hand: 4,
        head: 1,
        headWreathed: 1,
        skeleton: 2,
        skull: 2,
        skull2: 1
      },
      people: {
        cavalier: 3,
        cossack: 1,
        archer: 1,
        monk: 1
      },
      architecture: {
        bridge: 1,
        bridge2: 1,
        castle: 2,
        castle2: 1,
        column: 1,
        lighthouse: 1,
        palace: 1,
        pillar: 1,
        portcullis: 1,
        tower: 2,
        windmill: 1
      },
      seafaring: {
        anchor: 6,
        armillarySphere: 1,
        boat: 2,
        boat2: 1,
        caravel: 1,
        drakkar: 1,
        lymphad: 2,
        raft: 1,
        shipWheel: 1
      },
      tools: {
        anvil: 2,
        drawingCompass: 2,
        fan: 1,
        hook: 1,
        ladder: 1,
        ladder2: 1,
        pincers: 1,
        saw: 1,
        scale: 1,
        scaleImbalanced: 1,
        scalesHanging: 1,
        scissors: 1,
        scissors2: 1,
        shears: 1,
        trowel: 1
      },
      miscellaneous: {
        attire: 2,
        banner: 2,
        bell: 3,
        bookClosed: 1,
        bookClosed2: 1,
        bookOpen: 1,
        bucket: 1,
        buckle: 1,
        bugleHorn: 2,
        bugleHorn2: 1,
        chain: 2,
        chalice: 2,
        cowHorns: 3,
        crosier: 1,
        crown: 3,
        crown2: 2,
        drum: 1,
        fasces: 1,
        feather: 3,
        harp: 2,
        horseshoe: 3,
        hourglass: 2,
        key: 3,
        laurelWreath: 2,
        laurelWreath2: 1,
        log: 1,
        lute: 2,
        lyre: 1,
        mitre: 1,
        orb: 1,
        pot: 2,
        ramsHorn: 1,
        sceptre: 1,
        scrollClosed: 1,
        snowflake: 1,
        stagsAttires: 1,
        stirrup: 2,
        wheel: 3,
        wing: 2,
        wingSword: 1
      },
      inescutcheon: {
        inescutcheonHeater: 1,
        inescutcheonSpanish: 1,
        inescutcheonFrench: 1,
        inescutcheonHorsehead: 1,
        inescutcheonHorsehead2: 1,
        inescutcheonPolish: 1,
        inescutcheonHessen: 1,
        inescutcheonSwiss: 1,
        inescutcheonBoeotian: 1,
        inescutcheonRoman: 1,
        inescutcheonKite: 1,
        inescutcheonOldFrench: 1,
        inescutcheonRenaissance: 1,
        inescutcheonBaroque: 1,
        inescutcheonTarge: 1,
        inescutcheonTarge2: 1,
        inescutcheonPavise: 1,
        inescutcheonWedged: 1,
        inescutcheonFlag: 1,
        inescutcheonPennon: 1,
        inescutcheonGuidon: 1,
        inescutcheonBanner: 1,
        inescutcheonDovetail: 1,
        inescutcheonGonfalon: 1,
        inescutcheonPennant: 1,
        inescutcheonRound: 1,
        inescutcheonOval: 1,
        inescutcheonVesicaPiscis: 1,
        inescutcheonSquare: 1,
        inescutcheonDiamond: 1,
        inescutcheonNo: 1,
        inescutcheonFantasy1: 1,
        inescutcheonFantasy2: 1,
        inescutcheonFantasy3: 1,
        inescutcheonFantasy4: 1,
        inescutcheonFantasy5: 1,
        inescutcheonNoldor: 1,
        inescutcheonGondor: 1,
        inescutcheonEasterling: 1,
        inescutcheonErebor: 1,
        inescutcheonIronHills: 1,
        inescutcheonUrukHai: 1,
        inescutcheonMoriaOrc: 1
      },
      ornaments: {
        mantle: 0,
        ribbon1: 3,
        ribbon2: 2,
        ribbon3: 1,
        ribbon4: 1,
        ribbon8: 1,
        ribbon7: 1,
        ribbon6: 1,
        ribbon5: 1
      },
      uploaded: {},
      data: chargeData
    };
    var patternSize = { standard: 154, small: 20, smaller: 20, big: 5, smallest: 1 };
    var shieldPositions = {
      // shield-specific position: [x, y] (relative to center)
      heater: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-32.25, 37.5],
        h: [0, 50],
        i: [32.25, 37.5],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-30, 30],
        n: [0, 42.5],
        o: [30, 30],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.2, -66.6],
        B: [-22, -66.6],
        C: [22, -66.6],
        D: [66.2, -66.6],
        K: [-66.2, -20],
        E: [66.2, -20],
        J: [-55.5, 26],
        F: [55.5, 26],
        I: [-33, 62],
        G: [33, 62],
        H: [0, 89.5]
      },
      spanish: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 50],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.2, -66.6],
        B: [-22, -66.6],
        C: [22, -66.6],
        D: [66.2, -66.6],
        K: [-66.4, -20],
        E: [66.4, -20],
        J: [-66.4, 26],
        F: [66.4, 26],
        I: [-49, 70],
        G: [49, 70],
        H: [0, 92]
      },
      french: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 65],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.2, -66.6],
        B: [-22, -66.6],
        C: [22, -66.6],
        D: [66.2, -66.6],
        K: [-66.4, -20],
        E: [66.4, -20],
        J: [-66.4, 26],
        F: [66.4, 26],
        I: [-65.4, 70],
        G: [65.4, 70],
        H: [0, 89]
      },
      horsehead: {
        a: [-43.75, -47.5],
        b: [0, -50],
        c: [43.75, -47.5],
        d: [-35, 0],
        e: [0, 0],
        f: [35, 0],
        h: [0, 50],
        y: [-50, -50],
        z: [0, 55],
        j: [-35, -35],
        k: [0, -40],
        l: [35, -35],
        m: [-30, 30],
        n: [0, 40],
        o: [30, 30],
        p: [-27.5, 0],
        q: [27.5, 0],
        A: [-71, -52],
        B: [-24, -73],
        C: [24, -73],
        D: [71, -52],
        K: [-62, -16],
        E: [62, -16],
        J: [-39, 20],
        F: [39, 20],
        I: [-33.5, 60],
        G: [33.5, 60],
        H: [0, 91.5]
      },
      horsehead2: {
        a: [-37.5, -47.5],
        b: [0, -50],
        c: [37.5, -47.5],
        d: [-35, 0],
        e: [0, 0],
        f: [35, 0],
        g: [-35, 47.5],
        h: [0, 50],
        i: [35, 47.5],
        y: [-50, -50],
        z: [0, 55],
        j: [-30, -30],
        k: [0, -40],
        l: [30, -30],
        m: [-30, 30],
        n: [0, 40],
        o: [30, 30],
        p: [-27.5, 0],
        q: [27.5, 0],
        A: [-49, -39],
        B: [-22, -70],
        C: [22, -70],
        D: [49, -39],
        K: [-51, -2],
        E: [51, -2],
        J: [-38.5, 31],
        F: [38.5, 31],
        I: [-35, 67],
        G: [35, 67],
        H: [0, 85]
      },
      polish: {
        a: [-35, -50],
        b: [0, -50],
        c: [35, -50],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-37.5, 50],
        h: [0, 50],
        i: [37.5, 50],
        y: [-50, -50],
        z: [0, 65],
        j: [-27.5, -27.5],
        k: [0, -45],
        l: [27.5, -27.5],
        m: [-27.5, 27.5],
        n: [0, 45],
        o: [27.5, 27.5],
        p: [-32.5, 0],
        q: [32.5, 0],
        A: [-48, -52],
        B: [-23, -80],
        C: [23, -80],
        D: [48, -52],
        K: [-47, -10],
        E: [47, -10],
        J: [-62, 32],
        F: [62, 32],
        I: [-37, 68],
        G: [37, 68],
        H: [0, 86]
      },
      hessen: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 52.5],
        j: [-40, -40],
        k: [0, -40],
        l: [40, -40],
        m: [-40, 40],
        n: [0, 40],
        o: [40, 40],
        p: [-40, 0],
        q: [40, 0],
        A: [-69, -64],
        B: [-22, -76],
        C: [22, -76],
        D: [69, -64],
        K: [-66.4, -20],
        E: [66.4, -20],
        J: [-62, 26],
        F: [62, 26],
        I: [-46, 70],
        G: [46, 70],
        H: [0, 91.5]
      },
      swiss: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-32, 37.5],
        h: [0, 50],
        i: [32, 37.5],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-32, 32.5],
        n: [0, 42.5],
        o: [32, 32.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.2, -66.6],
        B: [-22, -66],
        C: [22, -66],
        D: [66.2, -66.6],
        K: [-63, -20],
        E: [63, -20],
        J: [-50, 26],
        F: [50, 26],
        I: [-29, 62],
        G: [29, 62],
        H: [0, 89.5]
      },
      boeotian: {
        a: [-37.5, -47.5],
        b: [0, -47.5],
        c: [37.5, -47.5],
        d: [-25, 0],
        e: [0, 0],
        f: [25, 0],
        g: [-37.5, 47.5],
        h: [0, 47.5],
        i: [37.5, 47.5],
        y: [-48, -48],
        z: [0, 60],
        j: [-32.5, -37.5],
        k: [0, -45],
        l: [32.5, -37.5],
        m: [-32.5, 37.5],
        n: [0, 45],
        o: [32.5, 37.5],
        p: [-20, 0],
        q: [20, 0],
        A: [-45, -55],
        B: [-20, -77],
        C: [20, -77],
        D: [45, -55],
        K: [-59, -25],
        E: [59, -25],
        J: [-58, 27],
        F: [58, 27],
        I: [-39, 63],
        G: [39, 63],
        H: [0, 81]
      },
      roman: {
        a: [-40, -52.5],
        b: [0, -52.5],
        c: [40, -52.5],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-40, 52.5],
        h: [0, 52.5],
        i: [40, 52.5],
        y: [-42.5, -52.5],
        z: [0, 65],
        j: [-30, -37.5],
        k: [0, -37.5],
        l: [30, -37.5],
        m: [-30, 37.5],
        n: [0, 37.5],
        o: [30, 37.5],
        p: [-30, 0],
        q: [30, 0],
        A: [-51.5, -65],
        B: [-17, -75],
        C: [17, -75],
        D: [51.5, -65],
        K: [-51.5, -21],
        E: [51.5, -21],
        J: [-51.5, 21],
        F: [51.5, 21],
        I: [-51.5, 65],
        G: [51.5, 65],
        H: [-17, 75],
        L: [17, 75]
      },
      kite: {
        b: [0, -65],
        e: [0, -15],
        h: [0, 35],
        z: [0, 35],
        k: [0, -50],
        n: [0, 20],
        p: [-20, -15],
        q: [20, -15],
        A: [-38, -52],
        B: [-29, -78],
        C: [29, -78],
        D: [38, -52],
        K: [-33, -20],
        E: [33, -20],
        J: [-25, 11],
        F: [25, 11],
        I: [-15, 42],
        G: [15, 42],
        H: [0, 73],
        L: [0, -91]
      },
      oldFrench: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-37.5, 50],
        h: [0, 50],
        i: [37.5, 50],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 45],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.2, -66.6],
        B: [-22, -66.6],
        C: [22, -66.6],
        D: [66.2, -66.6],
        K: [-66.2, -20],
        E: [66.2, -20],
        J: [-64, 26],
        F: [64, 26],
        I: [-45, 62],
        G: [45, 62],
        H: [0, 91]
      },
      renaissance: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-41.5, 0],
        e: [0, 0],
        f: [41.5, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-61, -55],
        B: [-23, -67],
        C: [23, -67],
        D: [61, -55],
        K: [-55, -11],
        E: [55, -11],
        J: [-65, 31],
        F: [65, 31],
        I: [-45, 76],
        G: [45, 76],
        H: [0, 87]
      },
      baroque: {
        a: [-43.75, -45],
        b: [0, -45],
        c: [43.75, -45],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 60],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-65, -54.5],
        B: [-22, -65],
        C: [22, -65],
        D: [65, -54.5],
        K: [-58.5, -15],
        E: [58.5, -15],
        J: [-65, 31],
        F: [66, 31],
        I: [-35, 73],
        G: [35, 73],
        H: [0, 89]
      },
      targe: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 50],
        j: [-40, -40],
        k: [0, -40],
        l: [40, -40],
        m: [-40, 40],
        n: [0, 40],
        o: [40, 40],
        p: [-32.5, 0],
        q: [32.5, 0],
        A: [-66.2, -60],
        B: [-22, -77],
        C: [22, -86],
        D: [60, -66.6],
        K: [-28, -20],
        E: [57, -20],
        J: [-61, 26],
        F: [61, 26],
        I: [-49, 63],
        G: [49, 59],
        H: [0, 80]
      },
      targe2: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-43.75, 50],
        h: [0, 50],
        i: [43.75, 50],
        y: [-50, -50],
        z: [0, 60],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-32.5, 0],
        q: [32.5, 0],
        A: [-55, -59],
        B: [-15, -59],
        C: [24, -79],
        D: [51, -58],
        K: [-40, -14],
        E: [51, -14],
        J: [-64, 26],
        F: [62, 26],
        I: [-46, 66],
        G: [48, 67],
        H: [0, 83]
      },
      pavise: {
        a: [-40, -52.5],
        b: [0, -52.5],
        c: [40, -52.5],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-40, 52.5],
        h: [0, 52.5],
        i: [40, 52.5],
        y: [-42.5, -52.5],
        z: [0, 60],
        j: [-30, -35],
        k: [0, -37.5],
        l: [30, -35],
        m: [-30, 35],
        n: [0, 37.5],
        o: [30, 35],
        p: [-30, 0],
        q: [30, 0],
        A: [-57, -55],
        B: [-22, -74],
        C: [22, -74],
        D: [57, -55],
        K: [-54, -11],
        E: [54, -11],
        J: [-50, 36],
        F: [50, 36],
        I: [-46, 81],
        G: [46, 81],
        H: [0, 81]
      },
      wedged: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.75, 0],
        e: [0, 0],
        f: [43.75, 0],
        g: [-32.25, 37.5],
        h: [0, 50],
        i: [32.25, 37.5],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-32.5, 32.5],
        n: [0, 42.5],
        o: [32.5, 32.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66, -53],
        B: [-22, -72.5],
        C: [22, -72.5],
        D: [66, -53],
        K: [-62.6, -13],
        E: [62.6, -13],
        J: [-50, 26],
        F: [50, 26],
        I: [-27, 62],
        G: [27, 62],
        H: [0, 87]
      },
      flag: {
        a: [-60, -40],
        b: [0, -40],
        c: [60, -40],
        d: [-60, 0],
        e: [0, 0],
        f: [60, 0],
        g: [-60, 40],
        h: [0, 40],
        i: [60, 40],
        y: [-60, -42.5],
        z: [0, 40],
        j: [-45, -30],
        k: [0, -30],
        l: [45, -30],
        m: [-45, 30],
        n: [0, 30],
        o: [45, 30],
        p: [-45, 0],
        q: [45, 0],
        A: [-81, -51],
        B: [-27, -51],
        C: [27, -51],
        D: [81, -51],
        K: [-81, -17],
        E: [81, -17],
        J: [-81, 17],
        F: [81, 17],
        I: [-81, 51],
        G: [81, 51],
        H: [-27, 51],
        L: [27, 51]
      },
      pennon: {
        a: [-75, -40],
        d: [-75, 0],
        e: [-25, 0],
        f: [25, 0],
        g: [-75, 40],
        y: [-70, -42.5],
        j: [-60, -30],
        m: [-60, 30],
        p: [-60, 0],
        q: [5, 0],
        A: [-81, -48],
        B: [-43, -36],
        C: [-4.5, -24],
        D: [33, -12],
        E: [72, 0],
        F: [33, 12],
        G: [-4.5, 24],
        H: [-43, 36],
        I: [-81, 48],
        J: [-81, 17],
        K: [-81, -17]
      },
      guidon: {
        a: [-60, -40],
        b: [0, -40],
        c: [60, -40],
        d: [-60, 0],
        e: [0, 0],
        g: [-60, 40],
        h: [0, 40],
        i: [60, 40],
        y: [-60, -42.5],
        z: [0, 40],
        j: [-45, -30],
        k: [0, -30],
        l: [45, -30],
        m: [-45, 30],
        n: [0, 30],
        o: [45, 30],
        p: [-45, 0],
        A: [-81, -51],
        B: [-27, -51],
        C: [27, -51],
        D: [78, -51],
        K: [-81, -17],
        E: [40.5, -17],
        J: [-81, 17],
        F: [40.5, 17],
        I: [-81, 51],
        G: [78, 51],
        H: [-27, 51],
        L: [27, 51]
      },
      banner: {
        a: [-50, -50],
        b: [0, -50],
        c: [50, -50],
        d: [-50, 0],
        e: [0, 0],
        f: [50, 0],
        g: [-50, 40],
        h: [0, 40],
        i: [50, 40],
        y: [-50, -50],
        z: [0, 40],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 27.5],
        n: [0, 27.5],
        o: [37.5, 27.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.5, -66.5],
        B: [-22, -66.5],
        C: [22, -66.5],
        D: [66.5, -66.5],
        K: [-66.5, -20],
        E: [66.5, -20],
        J: [-66.5, 26],
        F: [66.5, 26],
        I: [-66.5, 66.5],
        G: [66.5, 66.5],
        H: [-25, 75],
        L: [25, 75]
      },
      dovetail: {
        a: [-49.75, -50],
        b: [0, -50],
        c: [49.75, -50],
        d: [-49.75, 0],
        e: [0, 0],
        f: [49.75, 0],
        g: [-49.75, 50],
        i: [49.75, 50],
        y: [-50, -50],
        z: [0, 40],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 32.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.5, -66.5],
        B: [-22, -66.5],
        C: [22, -66.5],
        D: [66.5, -66.5],
        K: [-66.5, -16.5],
        E: [66.5, -16.5],
        J: [-66.5, 34.5],
        F: [66.5, 34.5],
        I: [-66.5, 84.5],
        G: [66.5, 84.5],
        H: [-25, 64],
        L: [25, 64]
      },
      gonfalon: {
        a: [-49.75, -50],
        b: [0, -50],
        c: [49.75, -50],
        d: [-49.75, 0],
        e: [0, 0],
        f: [49.75, 0],
        g: [-49.75, 50],
        h: [0, 50],
        i: [49.75, 50],
        y: [-50, -50],
        z: [0, 50],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.5, -66.5],
        B: [-22, -66.5],
        C: [22, -66.5],
        D: [66.5, -66.5],
        K: [-66.5, -20],
        E: [66.5, -20],
        J: [-66.5, 26],
        F: [66.5, 26],
        I: [-40, 63],
        G: [40, 63],
        H: [0, 88]
      },
      pennant: {
        a: [-45, -50],
        b: [0, -50],
        c: [45, -50],
        e: [0, 0],
        h: [0, 50],
        y: [-50, -50],
        z: [0, 50],
        j: [-32.5, -37.5],
        k: [0, -37.5],
        l: [32.5, -37.5],
        n: [0, 37.5],
        A: [-60, -76],
        B: [-22, -76],
        C: [22, -76],
        D: [60, -76],
        K: [-46, -38],
        E: [46, -38],
        J: [-31, 0],
        F: [31, 0],
        I: [-16, 38],
        G: [16, 38],
        H: [0, 76]
      },
      round: {
        a: [-40, -40],
        b: [0, -40],
        c: [40, -40],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-40, 40],
        h: [0, 40],
        i: [40, 40],
        y: [-48, -48],
        z: [0, 57.5],
        j: [-35.5, -35.5],
        k: [0, -37.5],
        l: [35.5, -35.5],
        m: [-35.5, 35.5],
        n: [0, 37.5],
        o: [35.5, 35.5],
        p: [-36.5, 0],
        q: [36.5, 0],
        A: [-59, -48],
        B: [-23, -73],
        C: [23, -73],
        D: [59, -48],
        K: [-76, -10],
        E: [76, -10],
        J: [-70, 31],
        F: [70, 31],
        I: [-42, 64],
        G: [42, 64],
        H: [0, 77]
      },
      oval: {
        a: [-37.5, -50],
        b: [0, -50],
        c: [37.5, -50],
        d: [-43, 0],
        e: [0, 0],
        f: [43, 0],
        g: [-37.5, 50],
        h: [0, 50],
        i: [37.5, 50],
        y: [-48, -48],
        z: [0, 60],
        j: [-35.5, -37.5],
        k: [0, -37.5],
        l: [35.5, -37.5],
        m: [-35.5, 37.5],
        n: [0, 50],
        o: [35.5, 37.5],
        p: [-36.5, 0],
        q: [36.5, 0],
        A: [-48, -48],
        B: [-23, -78],
        C: [23, -78],
        D: [48, -48],
        K: [-59, -10],
        E: [59, -10],
        J: [-55, 31],
        F: [55, 31],
        I: [-36, 68],
        G: [36, 68],
        H: [0, 85]
      },
      vesicaPiscis: {
        a: [-32, -37],
        b: [0, -50],
        c: [32, -37],
        d: [-32, 0],
        e: [0, 0],
        f: [32, 0],
        g: [-32, 37],
        h: [0, 50],
        i: [32, 37],
        y: [-50, -50],
        z: [0, 62],
        j: [-27.5, -27.5],
        k: [0, -37],
        l: [27.5, -27.5],
        m: [-27.5, 27.5],
        n: [0, 42],
        o: [27.5, 27.5],
        p: [-27.5, 0],
        q: [27.5, 0],
        A: [-45, -32],
        B: [-29, -63],
        C: [29, -63],
        D: [45, -32],
        K: [-50, 0],
        E: [50, 0],
        J: [-45, 32],
        F: [45, 32],
        I: [-29, 63],
        G: [29, 63],
        H: [0, 89],
        L: [0, -89]
      },
      square: {
        a: [-49.75, -50],
        b: [0, -50],
        c: [49.75, -50],
        d: [-49.75, 0],
        e: [0, 0],
        f: [49.75, 0],
        g: [-49.75, 50],
        h: [0, 50],
        i: [49.75, 50],
        y: [-50, -50],
        z: [0, 50],
        j: [-37.5, -37.5],
        k: [0, -37.5],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 37.5],
        o: [37.5, 37.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-66.5, -66.5],
        B: [-22, -66.5],
        C: [22, -66.5],
        D: [66.5, -66.5],
        K: [-66.5, -20],
        E: [66.5, -20],
        J: [-66.5, 26],
        F: [66.5, 26],
        I: [-66.5, 66.5],
        G: [66.5, 66.5],
        H: [-22, 66.5],
        L: [22, 66.5]
      },
      diamond: {
        a: [-32, -37],
        b: [0, -50],
        c: [32, -37],
        d: [-43, 0],
        e: [0, 0],
        f: [43, 0],
        g: [-32, 37],
        h: [0, 50],
        i: [32, 37],
        y: [-50, -50],
        z: [0, 62],
        j: [-27.5, -27.5],
        k: [0, -37],
        l: [27.5, -27.5],
        m: [-27.5, 27.5],
        n: [0, 42],
        o: [27.5, 27.5],
        p: [-37, 0],
        q: [37, 0],
        A: [-43, -28],
        B: [-22, -56],
        C: [22, -56],
        D: [43, -28],
        K: [-63, 0],
        E: [63, 0],
        J: [-42, 28],
        F: [42, 28],
        I: [-22, 56],
        G: [22, 56],
        H: [0, 83],
        L: [0, -82]
      },
      no: {
        a: [-66.5, -66.5],
        b: [0, -66.5],
        c: [66.5, -66.5],
        d: [-66.5, 0],
        e: [0, 0],
        f: [66.5, 0],
        g: [-66.5, 66.5],
        h: [0, 66.5],
        i: [66.5, 66.5],
        y: [-50, -50],
        z: [0, 75],
        j: [-50, -50],
        k: [0, -50],
        l: [50, -50],
        m: [-50, 50],
        n: [0, 50],
        o: [50, 50],
        p: [-50, 0],
        q: [50, 0],
        A: [-91.5, -91.5],
        B: [-30.5, -91.5],
        C: [30.5, -91.5],
        D: [91.5, -91.5],
        K: [-91.5, -30.5],
        E: [91.5, -30.5],
        J: [-91.5, 30.5],
        F: [91.5, 30.5],
        I: [-91.5, 91.5],
        G: [91.5, 91.5],
        H: [-30.5, 91.5],
        L: [30.5, 91.5]
      },
      fantasy1: {
        a: [-45, -45],
        b: [0, -50],
        c: [45, -45],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-36, 42.5],
        h: [0, 50],
        i: [36, 42.5],
        y: [-50, -50],
        z: [0, 60],
        j: [-37, -37],
        k: [0, -40],
        l: [37, -37],
        m: [-32, 32],
        n: [0, 40],
        o: [32, 32],
        p: [-28.5, 0],
        q: [28.5, 0],
        A: [-66, -55],
        B: [-22, -67],
        C: [22, -67],
        D: [66, -55],
        K: [-53, -20],
        E: [53, -20],
        J: [-46, 26],
        F: [46, 26],
        I: [-29, 62],
        G: [29, 62],
        H: [0, 84]
      },
      fantasy2: {
        a: [-45, -45],
        b: [0, -45],
        c: [45, -45],
        d: [-35, 0],
        e: [0, 0],
        f: [35, 0],
        g: [-36, 42.5],
        h: [0, 45],
        i: [36, 42.5],
        y: [-50, -50],
        z: [0, 55],
        j: [-32.5, -32.5],
        k: [0, -40],
        l: [32.5, -32.5],
        m: [-30, 30],
        n: [0, 40],
        o: [30, 30],
        p: [-27.5, 0],
        q: [27.5, 0],
        A: [-58, -35],
        B: [-44, -67],
        C: [44, -67],
        D: [58, -35],
        K: [-39, -5],
        E: [39, -5],
        J: [-57, 26],
        F: [57, 26],
        I: [-32, 58],
        G: [32, 58],
        H: [0, 83],
        L: [0, -72]
      },
      fantasy3: {
        a: [-40, -45],
        b: [0, -50],
        c: [40, -45],
        d: [-35, 0],
        e: [0, 0],
        f: [35, 0],
        g: [-36, 42.5],
        h: [0, 50],
        i: [36, 42.5],
        y: [-50, -50],
        z: [0, 55],
        j: [-32.5, -32.5],
        k: [0, -40],
        l: [32.5, -32.5],
        m: [-30, 30],
        n: [0, 40],
        o: [30, 30],
        p: [-27.5, 0],
        q: [27.5, 0],
        A: [-56, -42],
        B: [-22, -72],
        C: [22, -72],
        D: [56, -42],
        K: [-37, -11],
        E: [37, -11],
        J: [-60, 20],
        F: [60, 20],
        I: [-34, 56],
        G: [34, 56],
        H: [0, 83]
      },
      fantasy4: {
        a: [-50, -45],
        b: [0, -50],
        c: [50, -45],
        d: [-45, 0],
        e: [0, 0],
        f: [45, 0],
        g: [-40, 45],
        h: [0, 50],
        i: [40, 45],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-37.5, -37.5],
        k: [0, -45],
        l: [37.5, -37.5],
        m: [-37.5, 37.5],
        n: [0, 45],
        o: [37.5, 37.5],
        p: [-35, 0],
        q: [35, 0],
        A: [-75, -56],
        B: [-36, -61],
        C: [36, -61],
        D: [75, -56],
        K: [-67, -12],
        E: [67, -12],
        J: [-63, 32],
        F: [63, 32],
        I: [-42, 75],
        G: [42, 75],
        H: [0, 91.5],
        L: [0, -79]
      },
      fantasy5: {
        a: [-45, -50],
        b: [0, -50],
        c: [45, -50],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-30, 45],
        h: [0, 50],
        i: [30, 45],
        y: [-50, -50],
        z: [0, 60],
        j: [-37, -37],
        k: [0, -40],
        l: [37, -37],
        m: [-32, 32],
        n: [0, 40],
        o: [32, 32],
        p: [-28.5, 0],
        q: [28.5, 0],
        A: [-61, -67],
        B: [-22, -76],
        C: [22, -76],
        D: [61, -67],
        K: [-58, -25],
        E: [58, -25],
        J: [-48, 20],
        F: [48, 20],
        I: [-28.5, 60],
        G: [28.5, 60],
        H: [0, 89]
      },
      noldor: {
        b: [0, -65],
        e: [0, -15],
        h: [0, 35],
        z: [0, 35],
        k: [0, -50],
        n: [0, 30],
        p: [-20, -15],
        q: [20, -15],
        A: [-34, -47],
        B: [-20, -68],
        C: [20, -68],
        D: [34, -47],
        K: [-18, -20],
        E: [18, -20],
        J: [-26, 11],
        F: [26, 11],
        I: [-14, 43],
        G: [14, 43],
        H: [0, 74],
        L: [0, -85]
      },
      gondor: {
        a: [-32.5, -50],
        b: [0, -50],
        c: [32.5, -50],
        d: [-32.5, 0],
        e: [0, 0],
        f: [32.5, 0],
        g: [-32.5, 50],
        h: [0, 50],
        i: [32.5, 50],
        y: [-42.5, -52.5],
        z: [0, 65],
        j: [-25, -37.5],
        k: [0, -37.5],
        l: [25, -37.5],
        m: [-25, 30],
        n: [0, 37.5],
        o: [25, 30],
        p: [-25, 0],
        q: [25, 0],
        A: [-42, -52],
        B: [-17, -75],
        C: [17, -75],
        D: [42, -52],
        K: [-42, -15],
        E: [42, -15],
        J: [-42, 22],
        F: [42, 22],
        I: [-26, 60],
        G: [26, 60],
        H: [0, 87]
      },
      easterling: {
        a: [-40, -47.5],
        b: [0, -47.5],
        c: [40, -47.5],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-40, 47.5],
        h: [0, 47.5],
        i: [40, 47.5],
        y: [-42.5, -52.5],
        z: [0, 65],
        j: [-30, -37.5],
        k: [0, -37.5],
        l: [30, -37.5],
        m: [-30, 37.5],
        n: [0, 37.5],
        o: [30, 37.5],
        p: [-30, 0],
        q: [30, 0],
        A: [-52, -72],
        B: [0, -65],
        D: [52, -72],
        K: [-52, -24],
        E: [52, -24],
        J: [-52, 24],
        F: [52, 24],
        I: [-52, 72],
        G: [52, 72],
        H: [0, 65]
      },
      erebor: {
        a: [-40, -40],
        b: [0, -55],
        c: [40, -40],
        d: [-40, 0],
        e: [0, 0],
        f: [40, 0],
        g: [-40, 40],
        h: [0, 55],
        i: [40, 40],
        y: [-50, -50],
        z: [0, 50],
        j: [-35, -35],
        k: [0, -45],
        l: [35, -35],
        m: [-35, 35],
        n: [0, 45],
        o: [35, 35],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-47, -46],
        B: [-22, -81],
        C: [22, -81],
        D: [47, -46],
        K: [-66.5, 0],
        E: [66.5, 0],
        J: [-47, 46],
        F: [47, 46],
        I: [-22, 81],
        G: [22, 81]
      },
      ironHills: {
        a: [-43.75, -50],
        b: [0, -50],
        c: [43.75, -50],
        d: [-43.25, 0],
        e: [0, 0],
        f: [43.25, 0],
        g: [-42.5, 42.5],
        h: [0, 50],
        i: [42.5, 42.5],
        y: [-50, -50],
        z: [0, 62.5],
        j: [-32.5, -32.5],
        k: [0, -40],
        l: [32.5, -32.5],
        m: [-32.5, 32.5],
        n: [0, 40],
        o: [32.5, 32.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-61, -67],
        B: [-22, -74],
        C: [22, -74],
        D: [61, -67],
        K: [-59, -20],
        E: [59, -20],
        J: [-57, 26],
        F: [57, 26],
        I: [-33, 64],
        G: [33, 64],
        H: [0, 88]
      },
      urukHai: {
        a: [-40, -45],
        b: [0, -45],
        c: [40, -45],
        d: [-36, 0],
        e: [0, 0],
        f: [36, 0],
        g: [-32.25, 40],
        h: [0, 40],
        i: [32.25, 40],
        y: [-50, -50],
        z: [0, 40],
        j: [-32.5, -32.5],
        k: [0, -37.5],
        l: [32.5, -32.5],
        m: [-27.5, 27.5],
        n: [0, 32.5],
        o: [27.5, 27.5],
        p: [-37.5, 0],
        q: [37.5, 0],
        A: [-31, -79],
        B: [-1, -90],
        C: [31, -74],
        D: [61, -57],
        K: [-55, -19],
        E: [53, -19],
        J: [-45, 19],
        F: [45, 19],
        I: [-33, 57],
        G: [35, 57],
        H: [0, 57],
        L: [-39, -50]
      },
      moriaOrc: {
        a: [-37.5, -37.5],
        b: [0, -37.5],
        c: [37.5, -37.5],
        d: [-37.5, 0],
        e: [0, 0],
        f: [37.5, 0],
        g: [-37.5, 37.5],
        h: [0, 37.5],
        i: [37.5, 37.5],
        y: [-50, -50],
        z: [0, 40],
        j: [-30, -30],
        k: [0, -30],
        l: [30, -30],
        m: [-30, 30],
        n: [0, 30],
        o: [30, 30],
        p: [-30, 0],
        q: [30, 0],
        A: [-48, -48],
        B: [-16, -50],
        C: [16, -46],
        D: [39, -61],
        K: [-52, -19],
        E: [52, -26],
        J: [-42, 9],
        F: [52, 9],
        I: [-31, 40],
        G: [40, 43],
        H: [4, 47]
      }
    };
    var shieldSize = {
      horsehead: 0.9,
      horsehead2: 0.9,
      polish: 0.85,
      swiss: 0.95,
      boeotian: 0.75,
      roman: 0.95,
      kite: 0.65,
      targe2: 0.9,
      pavise: 0.9,
      wedged: 0.95,
      flag: 0.7,
      pennon: 0.5,
      guidon: 0.65,
      banner: 0.8,
      dovetail: 0.8,
      pennant: 0.6,
      oval: 0.95,
      vesicaPiscis: 0.8,
      diamond: 0.8,
      no: 1.2,
      fantasy1: 0.8,
      fantasy2: 0.7,
      fantasy3: 0.7,
      fantasy5: 0.9,
      noldor: 0.5,
      gondor: 0.75,
      easterling: 0.8,
      erebor: 0.9,
      urukHai: 0.8,
      moriaOrc: 0.7
    };
    var shieldBox = {
      heater: "0 10 200 200",
      spanish: "0 10 200 200",
      french: "0 10 200 200",
      horsehead: "0 10 200 200",
      horsehead2: "0 10 200 200",
      polish: "0 0 200 200",
      hessen: "0 5 200 200",
      swiss: "0 10 200 200",
      boeotian: "0 0 200 200",
      roman: "0 0 200 200",
      kite: "0 0 200 200",
      oldFrench: "0 10 200 200",
      renaissance: "0 5 200 200",
      baroque: "0 10 200 200",
      targe: "0 0 200 200",
      targe2: "0 0 200 200",
      pavise: "0 0 200 200",
      wedged: "0 10 200 200",
      flag: "0 0 200 200",
      pennon: "2.5 0 200 200",
      guidon: "2.5 0 200 200",
      banner: "0 10 200 200",
      dovetail: "0 10 200 200",
      gonfalon: "0 10 200 200",
      pennant: "0 0 200 200",
      round: "0 0 200 200",
      oval: "0 0 200 200",
      vesicaPiscis: "0 0 200 200",
      square: "0 0 200 200",
      diamond: "0 0 200 200",
      no: "0 0 200 200",
      fantasy1: "0 0 200 200",
      fantasy2: "0 5 200 200",
      fantasy3: "0 5 200 200",
      fantasy4: "0 5 200 200",
      fantasy5: "0 0 200 200",
      noldor: "0 0 200 200",
      gondor: "0 5 200 200",
      easterling: "0 0 200 200",
      erebor: "0 0 200 200",
      ironHills: "0 5 200 200",
      urukHai: "0 0 200 200",
      moriaOrc: "0 0 200 200"
    };
    module.exports = {
      charges,
      divisions,
      lines,
      ordinaries,
      positions,
      tinctures,
      colors,
      shields,
      shieldPositions,
      shieldSize,
      shieldBox,
      patternSize
    };
  }
});

// .armoria-build/templates.js
var require_templates = __commonJS({
  ".armoria-build/templates.js"(exports, module) {
    var shieldPaths = {
      heater: "m25,25 h150 v50 a150,150,0,0,1,-75,125 a150,150,0,0,1,-75,-125 z",
      spanish: "m25,25 h150 v100 a75,75,0,0,1,-150,0 z",
      french: "m 25,25 h 150 v 139.15 c 0,41.745 -66,18.15 -75,36.3 -9,-18.15 -75,5.445 -75,-36.3 v 0 z",
      horsehead: "m 20,40 c 0,60 40,80 40,100 0,10 -4,15 -0.35,30 C 65,185.7 81,200 100,200 c 19.1,0 35.3,-14.6 40.5,-30.4 C 144.2,155 140,150 140,140 140,120 180,100 180,40 142.72,40 150,15 100,15 55,15 55,40 20,40 Z",
      horsehead2: "M60 20c-5 20-10 35-35 55 25 35 35 65 30 100 20 0 35 10 45 26 10-16 30-26 45-26-5-35 5-65 30-100a87 87 0 01-35-55c-25 3-55 3-80 0z",
      polish: "m 90.3,6.3 c -12.7,0 -20.7,10.9 -40.5,14 0,11.8 -4.9,23.5 -11.4,31.1 0,0 12.7,6 12.7,19.3 C 51.1,90.8 30,90.8 30,90.8 c 0,0 -3.6,7.4 -3.6,22.4 0,34.3 23.1,60.2 40.7,68.2 17.6,8 27.7,11.4 32.9,18.6 5.2,-7.3 15.3,-10.7 32.8,-18.6 17.6,-8 40.7,-33.9 40.7,-68.2 0,-15 -3.6,-22.4 -3.6,-22.4 0,0 -21.1,0 -21.1,-20.1 0,-13.3 12.7,-19.3 12.7,-19.3 C 155.1,43.7 150.2,32.1 150.2,20.3 130.4,17.2 122.5,6.3 109.7,6.3 102.5,6.3 100,10 100,10 c 0,0 -2.5,-3.7 -9.7,-3.7 z",
      hessen: "M170 20c4 5 8 13 15 20 0 0-10 0-10 15 0 100-15 140-75 145-65-5-75-45-75-145 0-15-10-15-10-15l15-20c0 15 10-5 70-5s70 20 70 5z",
      swiss: "m 25,20 c -0.1,0 25.2,8.5 37.6,8.5 C 75.1,28.5 99.1,20 100,20 c 0.6,0 24.9,8.5 37.3,8.5 C 149.8,28.5 174.4,20 175,20 l -0.3,22.6 C 173.2,160.3 100,200 100,200 100,200 26.5,160.9 25.2,42.6 Z",
      boeotian: "M150 115c-5 0-10-5-10-15s5-15 10-15c10 0 7 10 15 10 10 0 0-30 0-30-10-25-30-55-65-55S45 40 35 65c0 0-10 30 0 30 8 0 5-10 15-10 5 0 10 5 10 15s-5 15-10 15c-10 0-7-10-15-10-10 0 0 30 0 30 10 25 30 55 65 55s55-30 65-55c0 0 10-30 0-30-8 0-5 10-15 10z",
      roman: "m 160,170 c -40,20 -80,20 -120,0 V 30 C 80,10 120,10 160,30 Z",
      kite: "m 53.3,46.4 c 0,4.1 1,12.3 1,12.3 7.1,55.7 45.7,141.3 45.7,141.3 0,0 38.6,-85.6 45.7,-141.2 0,0 1,-8.1 1,-12.3 C 146.7,20.9 125.8,0.1 100,0.1 74.2,0.1 53.3,20.9 53.3,46.4 Z",
      oldFrench: "m25,25 h150 v75 a100,100,0,0,1,-75,100 a100,100,0,0,1,-75,-100 z",
      renaissance: "M 25,33.9 C 33.4,50.3 36.2,72.9 36.2,81.7 36.2,109.9 25,122.6 25,141 c 0,29.4 24.9,44.1 40.2,47.7 15.3,3.7 29.3,0 34.8,11.3 5.5,-11.3 19.6,-7.6 34.8,-11.3 C 150.1,185 175,170.3 175,141 c 0,-18.4 -11.2,-31.1 -11.2,-59.3 0,-8.8 2.8,-31.3 11.2,-47.7 L 155.7,14.4 C 138.2,21.8 119.3,25.7 100,25.7 c -19.3,0 -38.2,-3.9 -55.7,-11.3 z",
      baroque: "m 100,25 c 18,0 50,2 75,14 v 37 l -2.7,3.2 c -4.9,5.4 -6.6,9.6 -6.7,16.2 0,6.5 2,11.6 6.9,17.2 l 2.8,3.1 v 10.2 c 0,17.7 -2.2,27.7 -7.8,35.9 -5,7.3 -11.7,11.3 -32.3,19.4 -12.6,5 -20.2,8.8 -28.6,14.5 C 103.3,198 100,200 100,200 c 0,0 -2.8,-2.3 -6.4,-4.7 C 85.6,189.8 78,186 65,180.9 32.4,168.1 26.9,160.9 25.8,129.3 L 25,116 l 3.3,-3.3 c 4.8,-5.2 7,-10.7 7,-17.3 0,-6.8 -1.8,-11.1 -6.5,-16.1 L 25,76 V 39 C 50,27 82,25 100,25 Z",
      targe: "m 20,35 c 15,0 115,-60 155,-10 -5,10 -15,15 -10,50 5,45 10,70 -10,90 C 125,195 75,195 50,175 25,150 30,130 35,85 50,95 65,85 65,70 65,50 50,45 40,50 30,55 27,65 30,70 23,73 20,70 14,70 11,60 20,45 20,35 Z",
      targe2: "m 84,32.2 c 6.2,-1 19.5,-31.4 94.1,-20.2 -30.57,33.64 -21.66,67.37 -11.2,95 20.2,69.5 -41.17549,84.7 -66.88,84.7 C 74.32,191.7071 8.38,168.95 32,105.9 36.88,92.88 31,89 31,82.6 35.15,82.262199 56.79,86.17 56.5,69.8 56.20,52.74 42.2,47.9 25.9,55.2 25.9,51.4 39.8,6.7 84,32.2 Z",
      pavise: "M95 7L39.9 37.3a10 10 0 00-5.1 9.5L46 180c.4 5.2 3.7 10 9 10h90c5.3 0 9.6-4.8 10-10l10.6-133.2a10 10 0 00-5-9.5L105 7c-4.2-2.3-6.2-2.3-10 0z",
      wedged: "m 51.2,19 h 96.4 c 3.1,12.7 10.7,20.9 26.5,20.8 C 175.7,94.5 165.3,144.3 100,200 43.5,154.2 22.8,102.8 25.1,39.7 37,38.9 47.1,34.7 51.2,19 Z",
      round: "m 185,100 a 85,85 0 0 1 -85,85 85,85 0 0 1 -85,-85 85,85 0 0 1 85,-85 85,85 0 0 1 85,85",
      oval: "m 32.3,99.5 a 67.7,93.7 0 1 1 0,1.3 z",
      vesicaPiscis: "M 100,0 C 63.9,20.4 41,58.5 41,100 c 0,41.5 22.9,79.6 59,100 36.1,-20.4 59,-58.5 59,-100 C 159,58.5 136.1,20.4 100,0 Z",
      square: "M 25,25 H 175 V 175 H 25 Z",
      diamond: "M 25,100 100,200 175,100 100,0 Z",
      no: "m0,0 h200 v200 h-200 z",
      flag: "M 10,40 h180 v120 h-180 Z",
      pennon: "M 10,40 l190,60 -190,60 Z",
      guidon: "M 10,40 h190 l-65,60 65,60 h-190 Z",
      banner: "m 25,25 v 170 l 25,-40 25,40 25,-40 25,40 25,-40 25,40 V 25 Z",
      dovetail: "m 25,25 v 175 l 75,-40 75,40 V 25 Z",
      gonfalon: "m 25,25 v 125 l 75,50 75,-50 V 25 Z",
      pennant: "M 25,15 100,200 175,15 Z",
      fantasy1: "M 100,5 C 85,30 40,35 15,40 c 40,35 20,90 40,115 15,25 40,30 45,45 5,-15 30,-20 45,-45 20,-25 0,-80 40,-115 C 160,35 115,30 100,5 Z",
      fantasy2: "m 152,21 c 0,0 -27,14 -52,-4 C 75,35 48,21 48,21 50,45 30,55 30,75 60,75 60,115 32,120 c 3,40 53,50 68,80 15,-30 65,-40 68,-80 -28,-5 -28,-45 2,-45 C 170,55 150,45 152,21 Z",
      fantasy3: "M 167,67 C 165,0 35,0 33,67 c 32,-7 27,53 -3,43 -5,45 60,65 70,90 10,-25 75,-47.51058 70,-90 -30,10 -35,-50 -3,-43 z",
      fantasy4: "M100 9C55 48 27 27 13 39c23 50 3 119 49 150 14 9 28 11 38 11s27-4 38-11c55-39 24-108 49-150-14-12-45 7-87-30z",
      fantasy5: "M 100,0 C 75,25 30,25 30,25 c 0,69 20,145 70,175 50,-30 71,-106 70,-175 0,0 -45,0 -70,-25 z",
      noldor: "m 55,75 h 2 c 3,-25 38,-10 3,20 15,50 30,75 40,105 10,-30 25,-55 40,-105 -35,-30 0,-45 3,-20 h 2 C 150,30 110,20 100,0 90,20 50,30 55,75 Z",
      gondor: "m 100,200 c 15,-15 38,-35 45,-60 h 5 V 30 h -5 C 133,10 67,10 55,30 h -5 v 110 h 5 c 7,25 30,45 45,60 z",
      easterling: "M 160,185 C 120,170 80,170 40,185 V 15 c 40,15 80,15 120,0 z",
      erebor: "M25 135 V60 l22-13 16-37 h75 l15 37 22 13 v75l-22 18-16 37 H63l-16-37z",
      ironHills: "m 30,25 60,-10 10,10 10,-10 60,10 -5,125 -65,50 -65,-50 z",
      urukHai: "M 30,60 C 40,60 60,50 60,20 l -5,-3 45,-17 75,40 -5,5 -35,155 -5,-35 H 70 v 35 z",
      moriaOrc: "M45 35c5 3 7 10 13 9h19c4-2 7-4 9-9 6 1 9 9 16 11 7-2 14 0 21 0 6-3 6-10 10-15 2-5 1-10-2-15-2-4-5-14-4-16 3 6 7 11 12 14 7 3 3 12 7 16 3 6 4 12 9 18 2 4 6 8 5 14 0 6-1 12 3 18-3 6-2 13-1 20 1 6-2 12-1 18 0 6-3 13 0 18 8 4 0 8-5 7-4 3-9 3-13 9-5 5-5 13-8 19 0 6 0 15-7 16-1 6-7 6-10 12-1-6 0-6-2-9l2-19c2-4 5-12-3-12-4-5-11-5-15 1l-13-18c-3-4-2 9-3 12 2 2-4-6-7-5-8-2-8 7-11 11-2 4-5 10-8 9 3-10 3-16 1-23-1-4 2-9-4-11 0-6 1-13-2-19-4-2-9-6-13-7V91c4-7-5-13 0-19-3-7 2-11 2-18-1-6 1-12 3-17v-1z"
    };
    var lines = {
      straight: "m 0,115 v -15 h 200 v 15",
      engrailed: `m 0,115 v -20 ${"a 6.25,6.25 0 0 0 12.5,0".repeat(16)} v 20`,
      invecked: `m 0,115 v -12.5 ${"a 6.25,6.25 0 0 1 12.5,0".repeat(16)} v 12.5`,
      embattled: `m 0,115 v -10 h 2.5 ${"v -10 h 15 v 10 h 15".repeat(6)} v -10 h 15 v 10 h 2.5 v 10`,
      wavy: `m 0,115 v -15 ${"c 8.9,-3.5 16,-3.1 25,0 8.9,3.5 16,3.1 25,0 8.9,-3.5 16,-3.2 25,0 8.9,3.5 16,3.2 25,0".repeat(2)} v 15`,
      raguly: `m 0,115 v -20 h 7 ${"l -5,10 h 10 l 5,-10 h 10".repeat(9)} l -5,10 h 10 l 5,-10 h 3 v 20`,
      dancetty: `m 0,115 v -10 l 10,-15 ${"l 15,20 15,-20".repeat(6)} l 10,15 v 10`,
      dentilly: `m 0,115 v -20 ${"l 10,10 v -10".repeat(19)} l 10,10 v 10`,
      angled: "m 0,115 v -20 h 100 v 10 h 100 v 10",
      urdy: `m 0,115 v -25 ${"l 5,5 v 10 l 5,5 5,-5 v -10 l 5,-5".repeat(3)} l 5,5 v 10 l 5,6 5,-6 v -10 l 5,-5 ${"l 5,5 v 10 l 5,5 5,-5 v -10 l 5,-5".repeat(2)} l 5,5 v 10 l 5,6 5,-6 v -10 l 5,-5 ${"l 5,5 v 10 l 5,5 5,-5 v -10 l 5,-5".repeat(3)} v 25`,
      indented: `m 0,115 v -20 ${"l 5,10 5,-10".repeat(20)} v 20`,
      bevilled: "m 0,115 v -22.5 h 110 l -20,15 h 110 v 7.5",
      nowy: "m 0,115 v -20 h 80 c 0,0 0.1,20.1 20,20 19.9,-0.1 20,-20 20,-20 h 80 v 20",
      nowyReversed: "m 0,115 v -10 h 80 c 0,0 0.1,-20.1 20,-20 19.9,0.1 20,20 20,20 h 80 v 10",
      potenty: `m 0,115 v -10 ${"h 7.5 v -5 h -5 v -5 h 15 v 5 h -5 v 5 h 7.5".repeat(10)} v 10`,
      potentyDexter: `m 0,115 v -20 h 3 ${"v 10 h 10 v -5 h -5 v -5 h 10".repeat(13)} v 10 h 2 v 20`,
      potentySinister: `m 0,115 v -10 h 2.5 ${"v -10 h 10 v 5 h -5 v 5 h 10".repeat(13)} v -10 h 2.5 v 20`,
      embattledGhibellin: `m 0,115 v -15 ${"l 5,-5 v 10 l 5,-5 5,5 V 95 l 5,5".repeat(10)} v 15`,
      embattledNotched: `m 0,115 v -10 ${"h 5 v -10 l 5,5 5,-5 v 10".repeat(13)} h 5 v 10`,
      embattledGrady: `m 0,115 v -20 ${"h 2.5 v 5 h 5 v 5 h 5 v -5 h 5 v -5 h 2.5".repeat(10)} v 20`,
      dovetailed: `m 0,115 v -20 ${"h 7 l -4,10 h 14 l -4,-10 h 7".repeat(10)} v 20`,
      dovetailedIndented: `m 0,115 v -15 ${"l 7,-5 -4,10 7,-5 7,5 -4,-10 7,5".repeat(10)} v 15`,
      nebuly: `m 0,115 v -10.1 h 2.35 ${"c 4,0 7.3,-2 7.3,-4.5 0,-1.2 -0.7,-2.3 -1.9,-3 -1.2,-0.8 -1.8,-1.9 -1.8,-3.1 0,-2.5 3.2,-4.5 7.2,-4.5 4.1,0 7.3,2 7.3,4.5 0,1.2 -0.7,2.3 -1.8,3.1 -1.2,0.7 -1.9,1.8 -1.9,3 0,2.5 3.3,4.5 7.3,4.5".repeat(9)} h 2.35 v 10.1`,
      rayonne: `m 0,115 v -5 ${"a9 9 0 003.1-4.6c.5-2 .4-3.9-.3-5.4-.7-1.5-.8-3.4-.3-5.4.5-2 1.7-3.6 3.1-4.6-.7 1.5-.8 3.4-.3 5.4.5 2 1.7 3.6 3.1 4.6a9 9 0 013.1 4.6c.5 2 .4 3.9-.3 5.4".repeat(17)} a9 9 0 003.1-4.6c.5-2 .4-3.9-.3-5.4-.7-1.5-.8-3.4-.3-5.4.5-2 1.7-3.6 3.1-4.6-.7 1.5-.8 3.4-.3 5.4.75 2.79 2.72 4.08 4.3 5.67 V 115`,
      seaWaves: `m 0,115 v -14.89 ${"c 1.59,-2.01 4.5,-5.18 8.74,-5.18 2.26,0 4.12,1.54 4.45,3.55 -0.57,-0.31 -1.23,-0.48 -1.93,-0.48 -2.16,0 -3.91,1.63 -3.91,3.64 0,2.01 1.75,3.64 3.91,3.64 4.25,0 7.16,-3.17 8.74,-5.18".repeat(10)} v 14.89`,
      dragonTeeth: `m 0,115 v -5.7 c 0,-2.7 2.4,4.2 3.9,5.7 ${"c -1.5,-4.6 -1.9,-10.3 -0.8,-16.2 1.1,-5.9 3.5,-10.7 6.3,-13.8 -1.5,4.6 -1.9,10.3 -0.8,16.2 1.1,5.9 3.5,10.7 6.4,13.8".repeat(17)} c -1.5,-4.6 -1.9,-10.3 -0.8,-16.2 1.1,-5.9 3.5,-10.7 6.3,-13.8 -1.5,4.6 -1.9,10.3 -0.8,16.2 0.6,2.9 1.5,5.6 2.7,8 v 5.7`,
      firTrees: `m 0,115 v -15 l 2,-3.5 -2,0.5 4,-7 ${"l 4,7 -2,-0.5 4,7 -2,-0.5 4,7 4,-7 -2,0.5 4,-7 -2,0.5 4,-7".repeat(12)} 4,7 -2,-0.5 2,3.5 v 15`,
      flechy: "m 0,115 v -15 h 85 l 15,-15 15,15 h 85 v 15",
      barby: "m 0,115 v -15 h 85 l 15,15 15,-15 h 85 v 15",
      enclavy: "m 0,115 v -15 H 85 V 85 h 30 v 15 h 85 v 15",
      escartely: "m 0,115 v -15 h 85 v 15 h 30 v -15 h 85 v 15",
      arched: "m 0,115 c 0,0 60,-19.8 100,-20 c 40,-0.2 100,20 100,20",
      archedReversed: "m 0,115 v -30 c 0,0 60,20.2 100,20 40,-0.2 100,-20 100,-20 v 30"
    };
    var templates = {
      // straight divisions
      perFess: `<rect x="0" y="100" width="200" height="100"/>`,
      perPale: `<rect x="100" y="0" width="100" height="200"/>`,
      perBend: `<polygon points="0,0 200,200 0,200"/>`,
      perBendSinister: `<polygon points="200,0 0,200 200,200"/>`,
      perChevron: `<polygon points="0,200 100,100 200,200"/>`,
      perChevronReversed: `<polygon points="0,0 100,100 200,0"/>`,
      perCross: `<rect x="100" y="0" width="100" height="100"/><rect x="0" y="100" width="100" height="100"/>`,
      perPile: `<polygon points="0,0 15,0 100,200 185,0 200,0 200,200 0,200"/>`,
      perSaltire: `<polygon points="0,0 0,200 200,0 200,200"/>`,
      gyronny: `<polygon points="0,0 200,200 200,100 0,100"/><polygon points="200,0 0,200 100,200 100,0"/>`,
      chevronny: `<path d="M0,80 100,-15 200,80 200,120 100,25 0,120z M0,160 100,65 200,160 200,200 100,105 0,200z M0,240 100,145 200,240 0,240z"/>`,
      // lined divisions
      perFessLined: (line) => `<path d="${line} V200 H0 Z"/>`,
      perPaleLined: (line) => `<path d="${line} V200 H0 Z" transform="rotate(-90 100 100)"/>`,
      perBendLined: (line) => `<path d="${line} V200 H0 Z" transform="translate(-10 -10) rotate(45 110 110) scale(1.1)"/>`,
      perBendSinisterLined: (line) => `<path d="${line} V200 H0 Z" transform="translate(-10 -10) rotate(-45 110 110) scale(1.1)"/>`,
      perChevronLined: (line) => `<path d="${line} L100,200 Z" transform="translate(129 71) rotate(-45 -100 100) scale(-1 1)"/><path d="${line} L100,200 Z" transform="translate(71 71) rotate(45 100 100)"/>`,
      perChevronReversedLined: (line) => `<path d="${line} L100,200 Z" transform="translate(-70.7 -70.7) rotate(225 100 100)"/><path d="${line} L100,200 Z" transform="translate(270.7 -70.7) rotate(-225 -100 100) scale(-1 1)"/>`,
      perCrossLined: (line) => `<path d="${line} V400 H0 Z" transform="translate(0 50) scale(.5)"/><path d="${line} V400 H0 Z" transform="translate(200 150) scale(-.5)"/>`,
      perPileLined: (line) => `<path d="${line} V200 H0 Z" transform="translate(161.66 10) rotate(66.66 -100 100) scale(-1 1)"/><path d="${line} V200 H0 Z" transform="translate(38.33 10) rotate(-66.66 100 100)"/>`,
      // straight ordinaries
      fess: `<rect x="0" y="75" width="200" height="50"/>`,
      pale: `<rect x="75" y="0" width="50" height="200"/>`,
      bend: `<polygon points="35,0 200,165 200,200 165,200 0,35 0,0"/>`,
      bendSinister: `<polygon points="0,165 165,0 200,0 200,35 35,200 0,200"/>`,
      chief: `<rect width="200" height="75"/>`,
      bar: `<rect x="0" y="87.5" width="200" height="25"/>`,
      gemelle: `<rect x="0" y="76" width="200" height="16"/><rect x="0" y="108" width="200" height="16"/>`,
      fessCotissed: `<rect x="0" y="67" width="200" height="8"/><rect x="0" y="83" width="200" height="34"/><rect x="0" y="125" width="200" height="8"/>`,
      fessDoubleCotissed: `<rect x="0" y="60" width="200" height="7.5"/><rect x="0" y="72.5" width="200" height="7.5"/><rect x="0" y="85" width="200" height="30"/><rect x="0" y="120" width="200" height="7.5"/><rect x="0" y="132.5" width="200" height="7.5"/>`,
      bendlet: `<polygon points="22,0 200,178 200,200 178,200 0,22 0,0"/>`,
      bendletSinister: `<polygon points="0,178 178,0 200,0 200,22 22,200 0,200"/>`,
      terrace: `<rect x="0" y="145" width="200" height="55"/>`,
      cross: `<polygon points="85,0 85,85 0,85 0,115 85,115 85,200 115,200 115,115 200,115 200,85 115,85 115,0"/>`,
      crossParted: `<path d="M 80 0 L 80 80 L 0 80 L 0 95 L 80 95 L 80 105 L 0 105 L 0 120 L 80 120 L 80 200 L 95 200 L 95 120 L 105 120 L 105 200 L 120 200 L 120 120 L 200 120 L 200 105 L 120 105 L 120 95 L 200 95 L 200 80 L 120 80 L 120 0 L 105 0 L 105 80 L 95 80 L 95 0 L 80 0 z M 95 95 L 105 95 L 105 105 L 95 105 L 95 95 z"/>`,
      saltire: `<path d="M 0,21 79,100 0,179 0,200 21,200 100,121 179,200 200,200 200,179 121,100 200,21 200,0 179,0 100,79 21,0 0,0 Z"/>`,
      saltireParted: `<path d="M 7 0 L 89 82 L 82 89 L 0 7 L 0 28 L 72 100 L 0 172 L 0 193 L 82 111 L 89 118 L 7 200 L 28 200 L 100 128 L 172 200 L 193 200 L 111 118 L 118 111 L 200 193 L 200 172 L 128 100 L 200 28 L 200 7 L 118 89 L 111 82 L 193 0 L 172 0 L 100 72 L 28 0 L 7 0 z M 100 93 L 107 100 L 100 107 L 93 100 L 100 93 z"/>`,
      mount: `<path d="m0,250 a100,100,0,0,1,200,0"/>`,
      point: `<path d="M0,200 Q80,180 100,135 Q120,180 200,200"/>`,
      flaunches: `<path d="M0,0 q120,100 0,200 M200,0 q-120,100 0,200"/>`,
      gore: `<path d="M20,0 Q30,75 100,100 Q80,150 100,200 L0,200 L0,0 Z"/>`,
      pall: `<polygon points="0,0 30,0 100,70 170,0 200,0 200,30 122,109 122,200 78,200 78,109 0,30"/>`,
      pallReversed: `<polygon points="0,200 0,170 78,91 78,0 122,0 122,91 200,170 200,200 170,200 100,130 30,200"/>`,
      chevron: `<polygon points="0,125 100,60 200,125 200,165 100,100 0,165"/>`,
      chevronReversed: `<polygon points="0,75 100,140 200,75 200,35 100,100 0,35"/>`,
      gyron: `<polygon points="0,0 100,100 0,100"/>`,
      quarter: `<rect width="100" height="100"/>`,
      canton: `<rect width="75" height="75"/>`,
      pile: `<polygon points="70,0 100,175 130,0"/>`,
      pileInBend: `<polygon points="200,200 200,144 25,25 145,200"/>`,
      pileInBendSinister: `<polygon points="0,200 0,144 175,25 55,200"/>`,
      piles: `<polygon points="46,0 75,175 103,0"/><polygon points="95,0 125,175 154,0"/>`,
      pilesInPoint: `<path d="M15,0 100,200 60,0Z M80,0 100,200 120,0Z M140,0 100,200 185,0Z"/>`,
      label: `<path d="m 46,54.8 6.6,-15.6 95.1,0 5.9,15.5 -16.8,0.1 4.5,-11.8 L 104,43 l 4.3,11.9 -16.8,0 4.3,-11.8 -37.2,0 4.5,11.8 -16.9,0 z"/>`,
      // lined ordinaries
      fessLined: (line) => `<path d="${line}" transform="translate(0 -25)"/><path d="${line}" transform="translate(0 25) rotate(180 100 100)"/><rect x="0" y="88" width="200" height="24" stroke="none"/>`,
      paleLined: (line) => `<path d="${line}" transform="rotate(-90 100 100) translate(0 -25)"/><path d="${line}" transform="rotate(90 100 100) translate(0 -25)"/><rect x="88" y="0" width="24" height="200" stroke="none"/>`,
      bendLined: (line) => `<path d="${line}" transform="translate(8 -18) rotate(45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-28 18) rotate(225 110 100) scale(1.1 1)"/><rect x="0" y="88" width="200" height="24" transform="translate(-10 0) rotate(45 110 100) scale(1.1 1)" stroke="none"/>`,
      bendSinisterLined: (line) => `<path d="${line}" transform="translate(-28 -18) rotate(-45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(8 18) rotate(-225 110 100) scale(1.1 1)"/><rect x="0" y="88" width="200" height="24" transform="translate(-10 0) rotate(-45 110 100) scale(1.1 1)" stroke="none"/>`,
      chiefLined: (line) => `<path d="${line}" transform="translate(0,-25) rotate(180.00001 100 100)"/><rect width="200" height="62" stroke="none"/>`,
      barLined: (line) => `<path d="${line}" transform="translate(0,-12.5)"/><path d="${line}" transform="translate(0,12.5) rotate(180.00001 100 100)"/><rect x="0" y="94" width="200" height="12" stroke="none"/>`,
      gemelleLined: (line) => `<path d="${line}" transform="translate(0,-22.5)"/><path d="${line}" transform="translate(0,22.5) rotate(180.00001 100 100)"/>`,
      fessCotissedLined: (line) => `<path d="${line}" transform="translate(0 15) scale(1 .5)"/><path d="${line}" transform="translate(0 85) rotate(180 100 50) scale(1 .5)"/><rect x="0" y="80" width="200" height="40"/>`,
      fessDoubleCotissedLined: (line) => `<rect x="0" y="85" width="200" height="30"/><rect x="0" y="72.5" width="200" height="7.5"/><rect x="0" y="120" width="200" height="7.5"/><path d="${line}" transform="translate(0 10) scale(1 .5)"/><path d="${line}" transform="translate(0 90) rotate(180 100 50) scale(1 .5)"/>`,
      bendletLined: (line) => `<path d="${line}" transform="translate(2 -12) rotate(45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-22 12) rotate(225 110 100) scale(1.1 1)"/><rect x="0" y="94" width="200" height="12" transform="translate(-10 0) rotate(45 110 100) scale(1.1 1)" stroke="none"/>`,
      bendletSinisterLined: (line) => `<path d="${line}" transform="translate(-22 -12) rotate(-45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(2 12) rotate(-225 110 100) scale(1.1 1)"/><rect x="0" y="94" width="200" height="12" transform="translate(-10 0) rotate(-45 110 100) scale(1.1 1)" stroke="none"/>`,
      terraceLined: (line) => `<path d="${line}" transform="translate(0,50)"/><rect x="0" y="164" width="200" height="36" stroke="none"/>`,
      crossLined: (line) => `<path d="${line}" transform="translate(0 -14.5)"/><path d="${line}" transform="rotate(180 100 100) translate(0 -14.5)"/><path d="${line}" transform="rotate(-90 100 100) translate(0 -14.5)"/><path d="${line}" transform="rotate(-270 100 100) translate(0 -14.5)"/>`,
      crossPartedLined: (line) => `<path d="${line}" transform="translate(0 -20)"/><path d="${line}" transform="rotate(180 100 100) translate(0 -20)"/><path d="${line}" transform="rotate(-90 100 100) translate(0 -20)"/><path d="${line}" transform="rotate(-270 100 100) translate(0 -20)"/>`,
      saltireLined: (line) => `<path d="${line}" transform="translate(0 -10) rotate(45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-20 10) rotate(225 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-20 -10) rotate(-45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(0 10) rotate(-225 110 100) scale(1.1 1)"/>`,
      saltirePartedLined: (line) => `<path d="${line}" transform="translate(3 -13) rotate(45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-23 13) rotate(225 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(-23 -13) rotate(-45 110 100) scale(1.1 1)"/><path d="${line}" transform="translate(3 13) rotate(-225 110 100) scale(1.1 1)"/>`
    };
    var patterns = {
      semy: (p, c1, c2, size, chargeId) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="#000"><rect width="200" height="200" fill="${c1}" stroke="none"/><g fill="${c2}"><use transform="translate(-100 -50)" href="#${chargeId}"/><use transform="translate(100 -50)" href="#${chargeId}"/><use transform="translate(0 50)" href="#${chargeId}"/></g></pattern>`,
      vair: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 50}" viewBox="0 0 25 50" patternUnits="userSpaceOnUse" stroke="#000" stroke-width=".2"><rect width="25" height="25" fill="${c1}" stroke="none"/><path d="m12.5,0 l6.25,6.25 v12.5 l6.25,6.25 h-25 l6.25,-6.25 v-12.5 z" fill="${c2}"/><rect x="0" y="25" width="25" height="25" fill="${c2}" stroke="none"/><path d="m25,25 l-6.25,6.25 v12.5 l-6.25,6.25 l-6.25,-6.25 v-12.5 l-6.25,-6.25 z" fill="${c1}"/><path d="M0 50 h25" fill="none"/></pattern>`,
      counterVair: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 50}" viewBox="0 0 25 50" patternUnits="userSpaceOnUse" stroke="#000" stroke-width=".2"><rect width="25" height="50" fill="${c2}" stroke="none"/><path d="m 12.5,0 6.25,6.25 v 12.5 L 25,25 18.75,31.25 v 12.5 L 12.5,50 6.25,43.75 V 31.25 L 0,25 6.25,18.75 V 6.25 Z" fill="${c1}"/></pattern>`,
      vairInPale: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 25 25" patternUnits="userSpaceOnUse"><rect width="25" height="25" fill="${c1}"/><path d="m12.5,0 l6.25,6.25 v12.5 l6.25,6.25 h-25 l6.25,-6.25 v-12.5 z" fill="${c2}" stroke="#000" stroke-width=".2"/></pattern>`,
      vairEnPointe: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 50}" viewBox="0 0 25 50" patternUnits="userSpaceOnUse"><rect width="25" height="25" fill="${c2}"/><path d="m12.5,0 l6.25,6.25 v12.5 l6.25,6.25 h-25 l6.25,-6.25 v-12.5 z" fill="${c1}"/><rect x="0" y="25" width="25" height="25" fill="${c1}" stroke-width="1" stroke="${c1}"/><path d="m12.5,25 l6.25,6.25 v12.5 l6.25,6.25 h-25 l6.25,-6.25 v-12.5 z" fill="${c2}"/></pattern>`,
      vairAncien: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${c1}"/><path fill="${c2}" stroke="none" d="m 0,90 c 10,0 25,-5 25,-40 0,-25 10,-40 25,-40 15,0 25,15 25,40 0,35 15,40 25,40 v 10 H 0 Z"/><path fill="none" stroke="#000" d="M 0,90 c 10,0 25,-5 25,-40 0,-35 15,-40 25,-40 10,0 25,5 25,40 0,35 15,40 25,40 M0,100 h100"/></pattern>`,
      potent: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="#000"><rect width="200" height="100" fill="${c1}" stroke="none"/><rect y="100" width="200" height="100" fill="${c2}" stroke="none"/><path d="m25 50h50v-50h50v50h50v50h-150z" fill="${c2}"/><path d="m25 100v50h50v50h50v-50h50v-50z" fill="${c1}"/><path d="m0 0h200 M0 100h200" fill="none"/></pattern>`,
      counterPotent: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="none"><rect width="200" height="200" fill="${c1}"/><path d="m25 50h50v-50h50v50h50v100h-50v50h-50v-50h-50v-50z" fill="${c2}"/><path d="m0 0h200 M0 100h200 M0 200h200"/></pattern>`,
      potentInPale: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 12.5}" viewBox="0 0 200 100" patternUnits="userSpaceOnUse" stroke-width="1"><rect width="200" height="100" fill="${c1}" stroke="none"/><path d="m25 50h50v-50h50v50h50v50h-150z" fill="${c2}" stroke="#000"/><path d="m0 0h200 M0 100h200" fill="none" stroke="#000"/></pattern>`,
      potentEnPointe: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="none"><rect width="200" height="200" fill="${c1}"/><path d="m0 0h25v50h50v50h50v-50h50v-50h25v100h-25v50h-50v50h-50v-50h-50v-50h-25v-100" fill="${c2}"/></pattern>`,
      ermine: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" fill="${c2}"><rect width="200" height="200" fill="${c1}"/><g stroke="none" fill="${c2}"><g transform="translate(-100 -50)"><path d="m100 81.1c-4.25 17.6-12.7 29.8-21.2 38.9 3.65-0.607 7.9-3.04 11.5-5.47-2.42 4.86-4.86 8.51-7.3 12.7 1.82-0.607 6.07-4.86 12.7-10.9 1.21 8.51 2.42 17.6 4.25 23.6 1.82-5.47 3.04-15.2 4.25-23.6 3.65 3.65 7.3 7.9 12.7 10.9l-7.9-13.3c3.65 1.82 7.9 4.86 11.5 6.07-9.11-9.11-17-21.2-20.6-38.9z"/><path d="m82.4 81.7c-0.607-0.607-6.07 2.42-9.72-4.25 7.9 6.68 15.2-7.3 21.8 1.82 1.82 4.25-6.68 10.9-12.1 2.42z"/><path d="m117 81.7c0.607-1.21 6.07 2.42 9.11-4.86-7.3 7.3-15.2-7.3-21.2 2.42-1.82 4.25 6.68 10.9 12.1 2.42z"/><path d="m101 66.5c-1.02-0.607 3.58-4.25-3.07-8.51 5.63 7.9-10.2 10.9-1.54 17.6 3.58 2.42 12.2-2.42 4.6-9.11z"/></g><g transform="translate(100 -50)"><path d="m100 81.1c-4.25 17.6-12.7 29.8-21.2 38.9 3.65-0.607 7.9-3.04 11.5-5.47-2.42 4.86-4.86 8.51-7.3 12.7 1.82-0.607 6.07-4.86 12.7-10.9 1.21 8.51 2.42 17.6 4.25 23.6 1.82-5.47 3.04-15.2 4.25-23.6 3.65 3.65 7.3 7.9 12.7 10.9l-7.9-13.3c3.65 1.82 7.9 4.86 11.5 6.07-9.11-9.11-17-21.2-20.6-38.9z"/><path d="m82.4 81.7c-0.607-0.607-6.07 2.42-9.72-4.25 7.9 6.68 15.2-7.3 21.8 1.82 1.82 4.25-6.68 10.9-12.1 2.42z"/><path d="m117 81.7c0.607-1.21 6.07 2.42 9.11-4.86-7.3 7.3-15.2-7.3-21.2 2.42-1.82 4.25 6.68 10.9 12.1 2.42z"/><path d="m101 66.5c-1.02-0.607 3.58-4.25-3.07-8.51 5.63 7.9-10.2 10.9-1.54 17.6 3.58 2.42 12.2-2.42 4.6-9.11z"/></g><g transform="translate(0 50)"><path d="m100 81.1c-4.25 17.6-12.7 29.8-21.2 38.9 3.65-0.607 7.9-3.04 11.5-5.47-2.42 4.86-4.86 8.51-7.3 12.7 1.82-0.607 6.07-4.86 12.7-10.9 1.21 8.51 2.42 17.6 4.25 23.6 1.82-5.47 3.04-15.2 4.25-23.6 3.65 3.65 7.3 7.9 12.7 10.9l-7.9-13.3c3.65 1.82 7.9 4.86 11.5 6.07-9.11-9.11-17-21.2-20.6-38.9z"/><path d="m82.4 81.7c-0.607-0.607-6.07 2.42-9.72-4.25 7.9 6.68 15.2-7.3 21.8 1.82 1.82 4.25-6.68 10.9-12.1 2.42z"/><path d="m117 81.7c0.607-1.21 6.07 2.42 9.11-4.86-7.3 7.3-15.2-7.3-21.2 2.42-1.82 4.25 6.68 10.9 12.1 2.42z"/><path d="m101 66.5c-1.02-0.607 3.58-4.25-3.07-8.51 5.63 7.9-10.2 10.9-1.54 17.6 3.58 2.42 12.2-2.42 4.6-9.11z"/></g></g></pattern>`,
      chequy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 50}" height="${size * 50}" viewBox="0 0 50 50" patternUnits="userSpaceOnUse" fill="${c2}"><rect width="50" height="50"/><rect width="25" height="25" fill="${c1}"/><rect x="25" y="25" width="25" height="25" fill="${c1}"/></pattern>`,
      lozengy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 50 50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="${c1}"/><polygon points="25,0 50,25 25,50 0,25" fill="${c2}"/></pattern>`,
      fusily: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 50}" viewBox="0 0 50 100" patternUnits="userSpaceOnUse"><rect width="50" height="100" fill="${c2}"/><polygon points="25,0 50,50 25,100 0,50" fill="${c1}"/></pattern>`,
      pally: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 100}" height="${size * 25}" viewBox="0 0 100 25" patternUnits="userSpaceOnUse"><rect width="100" height="25" fill="${c2}"/><rect x="25" y="0" width="25" height="25" fill="${c1}"/><rect x="75" y="0" width="25" height="25" fill="${c1}"/></pattern>`,
      barry: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 100}" viewBox="0 0 25 100" patternUnits="userSpaceOnUse"><rect width="25" height="100" fill="${c2}"/><rect x="0" y="25" width="25" height="25" fill="${c1}"/><rect x="0" y="75" width="25" height="25" fill="${c1}"/></pattern>`,
      gemelles: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 50 50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="${c1}"/><rect y="5" width="50" height="10" fill="${c2}"/><rect y="40" width="50" height="10" fill="${c2}"/></pattern>`,
      bendy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 100}" height="${size * 100}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${c1}"/><polygon points="0,25 75,100 25,100 0,75" fill="${c2}"/><polygon points="25,0 75,0 100,25 100,75" fill="${c2}"/></pattern>`,
      bendySinister: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 100}" height="${size * 100}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${c2}"/><polygon points="0,25 25,0 75,0 0,75" fill="${c1}"/><polygon points="25,100 100,25 100,75 75,100" fill="${c1}"/></pattern>`,
      palyBendy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 125.16}" height="${size * 71.52}" viewBox="0 0 175 100" patternUnits="userSpaceOnUse"><rect y="0" x="0" width="175" height="100" fill="${c2}"/><g fill="${c1}"><path d="m0 20 35 30v50l-35-30z"/><path d="m35 0 35 30v50l-35-30z"/><path d="m70 0h23l12 10v50l-35-30z"/><path d="m70 80 23 20h-23z"/><path d="m105 60 35 30v10h-35z"/><path d="m105 0h35v40l-35-30z"/><path d="m 140,40 35,30 v 30 h -23 l -12,-10z"/><path d="M 175,0 V 20 L 152,0 Z"/></g></pattern>`,
      barryBendy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 71.44}" height="${size * 125.02}" viewBox="0 0 100 175" patternUnits="userSpaceOnUse"><rect width="100" height="175" fill="${c2}"/><g fill="${c1}"><path d="m20 0 30 35h50l-30-35z"/><path d="m0 35 30 35h50l-30-35z"/><path d="m0 70v23l10 12h50l-30-35z"/><path d="m80 70 20 23v-23z"/><path d="m60 105 30 35h10v-35z"/><path d="m0 105v35h40l-30-35z"/><path d="m 40,140 30,35 h 30 v -23 l -10,-12 z"/><path d="m0 175h20l-20-23z"/></g></pattern>`,
      pappellony: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${c1}"/><circle cx="0" cy="51" r="45" stroke="${c2}" fill="${c1}" stroke-width="10"/><circle cx="100" cy="51" r="45" stroke="${c2}" fill="${c1}" stroke-width="10"/><circle cx="50" cy="1" r="45" stroke="${c2}" fill="${c1}" stroke-width="10"/></pattern>`,
      pappellony2: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse" stroke="#000" stroke-width="2"><rect width="100" height="100" fill="${c1}" stroke="none"/><circle cy="50" r="49" fill="${c2}"/><circle cx="100" cy="50" r="49" fill="${c2}"/><circle cx="50" cy="0" r="49" fill="${c1}"/></pattern>`,
      scaly: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse" stroke="#000"><rect width="100" height="100" fill="${c1}" stroke="none"/><path d="M 0,84 C -40,84 -50,49 -50,49 -50,79 -27,99 0,99 27,99 50,79 50,49 50,49 40,84 0,84 Z" fill="${c2}"/><path d="M 100,84 C 60,84 50,49 50,49 c 0,30 23,50 50,50 27,0 50,-20 50,-50 0,0 -10,35 -50,35 z" fill="${c2}"/><path d="M 50,35 C 10,35 0,0 0,0 0,30 23,50 50,50 77,50 100,30 100,0 100,0 90,35 50,35 Z" fill="${c2}"/></pattern>`,
      plumetty: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 50}" viewBox="0 0 50 100" patternUnits="userSpaceOnUse" stroke-width=".8"><rect width="50" height="100" fill="${c2}" stroke="none"/><path fill="${c1}" stroke="none" d="M 25,100 C 44,88 49.5,74 50,50 33.5,40 25,25 25,4e-7 25,25 16.5,40 0,50 0.5,74 6,88 25,100 Z"/><path fill="none" stroke="${c2}" d="m17 40c5.363 2.692 10.7 2.641 16 0m-19 7c7.448 4.105 14.78 3.894 22 0m-27 7c6-2 10.75 3.003 16 3 5.412-0.0031 10-5 16-3m-35 9c4-7 12 3 19 2 7 1 15-9 19-2m-35 6c6-2 11 3 16 3s10-5 16-3m-30 7c8 0 8 3 14 3s7-3 14-3m-25 8c7.385 4.048 14.72 3.951 22 0m-19 8c5.455 2.766 10.78 2.566 16 0m-8 6v-78"/><g fill="none" stroke="${c1}"><path d="m42 90c2.678 1.344 5.337 2.004 8 2m-11 5c3.686 2.032 7.344 3.006 10.97 3m0.0261-1.2e-4v-30"/><path d="m0 92c2.689 0.0045 5.328-0.6687 8-2m-8 10c3.709-0.0033 7.348-1.031 11-3m-11 3v-30"/><path d="m0 7c5.412-0.0031 10-5 16-3m-16 11c7 1 15-9 19-2m-19 9c5 0 10-5 16-3m-16 10c6 0 7-3 14-3m-14.02 11c3.685-0.002185 7.357-1.014 11.02-3m-11 10c2.694-0.01117 5.358-0.7036 7.996-2m-8 6v-48"/><path d="m34 4c6-2 10.75 3.003 16 3m-19 6c4-7 12 3 19 2m-16 4c6-2 11 3 16 3m-14 4c8 0 8 3 14 3m-11 5c3.641 1.996 7.383 2.985 11 3m-8 5c2.762 1.401 5.303 2.154 8.002 2.112m-0.00154 3.888v-48"/></g></pattern>`,
      masoned: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 25}" height="${size * 25}" viewBox="0 0 100 100" patternUnits="userSpaceOnUse" fill="none"><rect width="100" height="100" fill="${c1}"/><rect width="100" height="50" stroke="${c2}" stroke-width="4"/><line x1="50" y1="50" x2="50" y2="100" stroke="${c2}" stroke-width="5"/></pattern>`,
      fretty: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 40}" height="${size * 40}" viewBox="0 0 140 140" patternUnits="userSpaceOnUse" stroke="#000" stroke-width="2"><rect width="140" height="140" fill="${c1}" stroke="none"/><path d="m-15 5 150 150 20-20-150-150z" fill="${c2}"/><path d="m10 150 140-140-20-20-140 140z" fill="${c2}" stroke="none"/><path d="m0 120 20 20 120-120-20-20z" fill="none"/></pattern>`,
      grillage: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 50}" height="${size * 50}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="#000" stroke-width="2"><rect width="200" height="200" fill="${c1}" stroke="none"/><path d="m205 65v-30h-210v30z" fill="${c2}"/><path d="m65-5h-30v210h30z" fill="${c2}"/><path d="m205 165v-30h-210v30z" fill="${c2}"/><path d="m165,65h-30v140h30z" fill="${c2}"/><path d="m 165,-5h-30v40h30z" fill="${c2}"/></pattern>`,
      chainy: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 33.4}" height="${size * 33.4}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="#000" stroke-width="2"><rect x="-6.691e-6" width="200" height="200" fill="${c1}" stroke="none"/><path d="m155-5-20-20-160 160 20 20z" fill="${c2}"/><path d="m45 205 160-160 20 20-160 160z" fill="${c2}"/><path d="m45-5 20-20 160 160-20 20-160-160" fill="${c2}"/><path d="m-5 45-20 20 160 160 20-20-160-160" fill="${c2}"/></pattern>`,
      maily: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 33.4}" height="${size * 33.4}" viewBox="0 0 200 200" patternUnits="userSpaceOnUse" stroke="#000" stroke-width="1.2"><path fill="${c1}" stroke="none" d="M0 0h200v200H0z"/><g fill="${c2}"><path d="m80-2c-5.27e-4 2.403-0.1094 6.806-0.3262 9.199 5.014-1.109 10.1-1.768 15.19-2.059 0.09325-1.712 0.1401-5.426 0.1406-7.141z"/><path d="m100 5a95 95 0 0 0-95 95 95 95 0 0 0 95 95 95 95 0 0 0 95-95 95 95 0 0 0-95-95zm0 15a80 80 0 0 1 80 80 80 80 0 0 1-80 80 80 80 0 0 1-80-80 80 80 0 0 1 80-80z"/><path d="m92.8 20.33c-5.562 0.4859-11.04 1.603-16.34 3.217-7.793 25.31-27.61 45.12-52.91 52.91-5.321 1.638-10.8 2.716-16.34 3.217-2.394 0.2168-6.796 0.3256-9.199 0.3262v15c1.714-4.79e-4 5.429-0.04737 7.141-0.1406 5.109-0.2761 10.19-0.9646 15.19-2.059 36.24-7.937 64.54-36.24 72.47-72.47z"/><path d="m202 80c-2.403-5.31e-4 -6.806-0.1094-9.199-0.3262 1.109 5.014 1.768 10.1 2.059 15.19 1.712 0.09326 5.426 0.1401 7.141 0.1406z"/><path d="m179.7 92.8c-0.4859-5.562-1.603-11.04-3.217-16.34-25.31-7.793-45.12-27.61-52.91-52.91-1.638-5.321-2.716-10.8-3.217-16.34-0.2168-2.394-0.3256-6.796-0.3262-9.199h-15c4.8e-4 1.714 0.0474 5.429 0.1406 7.141 0.2761 5.109 0.9646 10.19 2.059 15.19 7.937 36.24 36.24 64.54 72.47 72.47z"/><path d="m120 202c5.3e-4 -2.403 0.1094-6.806 0.3262-9.199-5.014 1.109-10.1 1.768-15.19 2.059-0.0933 1.712-0.1402 5.426-0.1406 7.141z"/><path d="m107.2 179.7c5.562-0.4859 11.04-1.603 16.34-3.217 7.793-25.31 27.61-45.12 52.91-52.91 5.321-1.638 10.8-2.716 16.34-3.217 2.394-0.2168 6.796-0.3256 9.199-0.3262v-15c-1.714 4.7e-4 -5.429 0.0474-7.141 0.1406-5.109 0.2761-10.19 0.9646-15.19 2.059-36.24 7.937-64.54 36.24-72.47 72.47z"/><path d="m -2,120 c 2.403,5.4e-4 6.806,0.1094 9.199,0.3262 -1.109,-5.014 -1.768,-10.1 -2.059,-15.19 -1.712,-0.0933 -5.426,-0.1402 -7.141,-0.1406 z"/><path d="m 20.33,107.2 c 0.4859,5.562 1.603,11.04 3.217,16.34 25.31,7.793 45.12,27.61 52.91,52.91 1.638,5.321 2.716,10.8 3.217,16.34 0.2168,2.394 0.3256,6.796 0.3262,9.199 L 95,202 c -4.8e-4,-1.714 -0.0472,-5.44 -0.1404,-7.152 -0.2761,-5.109 -0.9646,-10.19 -2.059,-15.19 -7.937,-36.24 -36.24,-64.54 -72.47,-72.47 z"/></g></pattern>`,
      honeycombed: (p, c1, c2, size) => `<pattern id="${p}" width="${size * 28.6}" height="${size * 49.028}" viewBox="0 0 70 120" patternUnits="userSpaceOnUse"><rect width="70" height="120" fill="${c1}"/><path d="M 70,0 V 20 L 35,40 m 35,80 V 100 L 35,80 M 0,120 V 100 L 35,80 V 40 L 0,20 V 0" stroke="${c2}" fill="none" stroke-width="3"/></pattern>`
    };
    var blacklight = `<radialGradient id="backlight" cx="100%" cy="100%" r="150%">
  <stop stop-color="#fff" stop-opacity=".3" offset="0"/>
  <stop stop-color="#fff" stop-opacity=".15" offset=".25"/>
  <stop stop-color="#000" stop-opacity="0" offset="1"/>
</radialGradient>`;
    module.exports = { shieldPaths, lines, templates, patterns, blacklight };
  }
});

// .armoria-build/renderer.js
var require_renderer = __commonJS({
  ".armoria-build/renderer.js"(exports, module) {
    var { shieldPositions, shieldSize, shieldBox } = require_dataModel();
    var { shieldPaths, blacklight } = require_templates();
    var _chargesBasePath = "./armoria/charges/";
    function setChargesBasePath(p) {
      _chargesBasePath = p.endsWith("/") ? p : p + "/";
    }
    async function draw(id, coa, size, colors) {
      const { division, ordinaries = [], charges = [], shield } = coa;
      const ordinariesRegular = ordinaries.filter((o) => !o.above);
      const ordinariesAboveCharges = ordinaries.filter((o) => o.above);
      const shieldPath = shieldPaths[shield];
      const tDiv = division ? division.t.includes("-") ? division.t.split("-")[1] : division.t : null;
      const positions = shieldPositions[shield];
      const sizeModifier = shieldSize[shield] || 1;
      const viewBox = shieldBox[shield] || "0 0 200 200";
      const loadedCharges = await getCharges(coa, id, shieldPath);
      const loadedPatterns = getPatterns(coa, id);
      const shieldClip = `<clipPath id="${shield}_${id}"><path d="${shieldPath}"/></clipPath>`;
      const divisionClip = division ? `<clipPath id="divisionClip_${id}">${getTemplate(division.division, division.line)}</clipPath>` : "";
      const field = `<rect x="0" y="0" width="200" height="200" fill="${clr(coa.t1)}"/>`;
      const divisionGroup = division ? templateDivision() : "";
      const overlay = `<path d="${shieldPath}" fill="url(#backlight)" stroke="#333"/>`;
      return `<svg id="${id}" width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>${shieldClip}${divisionClip}${loadedCharges}${loadedPatterns}${blacklight}</defs>
      <g clip-path="url(#${shield}_${id})">${field}${divisionGroup}${templateAboveAll()}</g>
      ${overlay}</svg>`;
      function templateDivision() {
        let svg = "";
        for (const ordinary of ordinariesRegular) {
          if (ordinary.divided === "field") svg += templateOrdinary(ordinary, ordinary.t);
          else if (ordinary.divided === "counter") svg += templateOrdinary(ordinary, tDiv);
        }
        for (const charge of charges) {
          if (charge.divided === "field") svg += templateCharge(charge, charge.t);
          else if (charge.divided === "counter") svg += templateCharge(charge, tDiv);
        }
        for (const ordinary of ordinariesAboveCharges) {
          if (ordinary.divided === "field") svg += templateOrdinary(ordinary, ordinary.t);
          else if (ordinary.divided === "counter") svg += templateOrdinary(ordinary, tDiv);
        }
        svg += `<g clip-path="url(#divisionClip_${id})"><rect x="0" y="0" width="200" height="200" fill="${clr(
          division.t
        )}"/>`;
        for (const ordinary of ordinariesRegular) {
          if (ordinary.divided === "division") svg += templateOrdinary(ordinary, ordinary.t);
          else if (ordinary.divided === "counter") svg += templateOrdinary(ordinary, coa.t1);
        }
        for (const charge of charges) {
          if (charge.divided === "division") svg += templateCharge(charge, charge.t);
          else if (charge.divided === "counter") svg += templateCharge(charge, coa.t1);
        }
        for (const ordinary of ordinariesAboveCharges) {
          if (ordinary.divided === "division") svg += templateOrdinary(ordinary, ordinary.t);
          else if (ordinary.divided === "counter") svg += templateOrdinary(ordinary, coa.t1);
        }
        return svg += `</g>`;
      }
      function templateAboveAll() {
        let svg = "";
        ordinariesRegular.filter((o) => !o.divided).forEach((ordinary) => {
          svg += templateOrdinary(ordinary, ordinary.t);
        });
        charges.filter((o) => !o.divided || !division).forEach((charge) => {
          svg += templateCharge(charge, charge.t, charge.t2, charge.t3);
        });
        ordinariesAboveCharges.filter((o) => !o.divided).forEach((ordinary) => {
          svg += templateOrdinary(ordinary, ordinary.t);
        });
        return svg;
      }
      function templateOrdinary(ordinary, tincture) {
        const fill = clr(tincture);
        let svg = `<g fill="${fill}" stroke="none"${tr(transform(ordinary))}>`;
        if (ordinary.ordinary === "bordure")
          svg += `<path d="${shieldPath}" fill="none" stroke="${fill}" stroke-width="16.7%"/>`;
        else if (ordinary.ordinary === "orle")
          svg += `<path d="${shieldPath}" fill="none" stroke="${fill}" stroke-width="5%" transform="translate(15 15) scale(.85)"/>`;
        else svg += getTemplate(ordinary.ordinary, ordinary.line);
        return svg + "</g>";
      }
      function templateCharge(charge, tincture, secondaryTincture, tertiaryTincture) {
        const primary = clr(tincture);
        const secondary = clr(secondaryTincture || tincture);
        const tertiary = clr(tertiaryTincture || tincture);
        const stroke = charge.stroke || "#000";
        const chargePositions = [...new Set(charge.p)].filter((position) => positions[position]);
        let svg = `<g fill="${primary}" stroke="${stroke}"${tr(transform(charge))}>`;
        svg += `<style>
      g.secondary,path.secondary {fill: ${secondary};}
      g.tertiary,path.tertiary {fill: ${tertiary};}
    </style>`;
        for (const p of chargePositions) {
          const transformAttr = tr(getElTransform(charge, p, sizeModifier, positions));
          svg += `<use xlink:href="#${charge.charge}_${id}"${transformAttr}/>`;
        }
        return svg + "</g>";
      }
      function getPatterns(coa2, id2) {
        const isPattern = (string) => string.includes("-");
        let patternsToAdd = [];
        if (coa2.t1.includes("-")) patternsToAdd.push(coa2.t1);
        if (coa2.division && isPattern(coa2.division.t)) patternsToAdd.push(coa2.division.t);
        if (coa2.ordinaries)
          coa2.ordinaries.filter((ordinary) => isPattern(ordinary.t)).forEach((ordinary) => patternsToAdd.push(ordinary.t));
        if (coa2.charges) coa2.charges.filter((charge) => isPattern(charge.t)).forEach((charge) => patternsToAdd.push(charge.t));
        if (!patternsToAdd.length) return "";
        const { patterns } = require_templates();
        return [...new Set(patternsToAdd)].map((patternString) => {
          const [pattern, t1, t2, size2] = patternString.split("-");
          const charge = semy(patternString);
          if (charge) return patterns.semy(patternString, clr(t1), clr(t2), getSizeMod(size2), charge + "_" + id2);
          return patterns[pattern](patternString, clr(t1), clr(t2), getSizeMod(size2), charge);
        }).join("");
      }
      function clr(tincture) {
        if (colors[tincture]) return colors[tincture];
        if (tincture[0] === "#") return tincture;
        return `url(#${tincture})`;
      }
    }
    async function getCharges(coa, id, shieldPath) {
      let charges = coa.charges ? coa.charges.map((charge) => charge.charge) : [];
      if (semy(coa.t1)) charges.push(semy(coa.t1));
      if (semy(coa.division?.t)) charges.push(semy(coa.division.t));
      const uniqueCharges = [...new Set(charges)];
      const fetchedCharges = await Promise.all(
        uniqueCharges.map(async (charge) => {
          if (charge.slice(0, 12) === "inescutcheon") {
            const path = charge.length > 12 ? shieldPaths[charge.slice(12, 13).toLowerCase() + charge.slice(13)] : shieldPath;
            return `<g id="${charge}_${id}"><path transform="translate(66 66) scale(.34)" d="${path}"/></g>`;
          }
          const fetched = await fetchCharge(charge, id);
          return fetched || "";
        })
      );
      return fetchedCharges.join("");
    }
    async function fetchCharge(charge, id) {
      try {
        const resp = await fetch(_chargesBasePath + encodeURIComponent(charge) + ".svg");
        if (!resp.ok) return null;
        const text = await resp.text();
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const g = doc.querySelector("g");
        if (!g) return null;
        g.setAttribute("id", charge + "_" + id);
        return g.outerHTML;
      } catch (e) {
        console.warn("[armoria] charge load failed:", charge, e);
        return null;
      }
    }
    function getSizeMod(size) {
      if (size === "small") return 0.8;
      if (size === "smaller") return 0.5;
      if (size === "smallest") return 0.25;
      if (size === "big") return 1.6;
      if (size === "bigger") return 2;
      return 1;
    }
    function getTemplate(template, line) {
      const { lines, templates } = require_templates();
      if (!line || line === "straight") return templates[template];
      const templateId = template + "Lined", linePath = lines[line];
      return templates[templateId](linePath);
    }
    function semy(string) {
      const isSemy = /^semy/.test(string);
      if (!isSemy) return false;
      return string.match(/semy_of_(.*?)-/)[1];
    }
    function round(n) {
      return Math.round(n * 100) / 100;
    }
    function tr(value) {
      return value ? ` transform="${value}"` : "";
    }
    function getElTransform(c, p, sizeModifier, positions) {
      const s = round((c.size || 1) * sizeModifier);
      const sx = c.sinister ? -s : s;
      const sy = c.reversed ? -s : s;
      let [x, y] = positions[p];
      x = round(x - 100 * (sx - 1));
      y = round(y - 100 * (sy - 1));
      const translate = x || y ? `translate(${x} ${y})` : null;
      const scale = sx !== 1 || sy !== 1 ? sx === sy ? `scale(${sx})` : `scale(${sx} ${sy})` : null;
      return translate && scale ? `${translate} ${scale}` : translate ? translate : scale ? scale : null;
    }
    function transform(charge) {
      let { x = 0, y = 0, angle = 0, size = 1, p } = charge;
      if (p) size = 1;
      if (size !== 1) {
        x = round(x + 100 - size * 100);
        y = round(y + 100 - size * 100);
      }
      let transform2 = "";
      if (x || y) transform2 += `translate(${x} ${y})`;
      if (angle) transform2 += ` rotate(${angle} ${size * 100} ${size * 100})`;
      if (size !== 1) transform2 += ` scale(${size})`;
      return transform2 ? transform2.trim() : null;
    }
    module.exports = { draw, setChargesBasePath };
  }
});

// .armoria-build/alea.js
var require_alea = __commonJS({
  ".armoria-build/alea.js"(exports, module) {
    function aleaPRNG() {
      return (function(args) {
        "use strict";
        const version = "aleaPRNG 1.1.0";
        var s0, s1, s2, c, uinta = new Uint32Array(3), initialArgs, mashver = "";
        function _initState(_internalSeed) {
          var mash = Mash();
          s0 = mash(" ");
          s1 = mash(" ");
          s2 = mash(" ");
          c = 1;
          for (var i = 0; i < _internalSeed.length; i++) {
            s0 -= mash(_internalSeed[i]);
            if (s0 < 0) {
              s0 += 1;
            }
            s1 -= mash(_internalSeed[i]);
            if (s1 < 0) {
              s1 += 1;
            }
            s2 -= mash(_internalSeed[i]);
            if (s2 < 0) {
              s2 += 1;
            }
          }
          mashver = mash.version;
          mash = null;
        }
        function Mash() {
          var n = 4022871197;
          var mash = function(data) {
            data = data.toString();
            for (var i = 0, l = data.length; i < l; i++) {
              n += data.charCodeAt(i);
              var h = 0.02519603282416938 * n;
              n = h >>> 0;
              h -= n;
              h *= n;
              n = h >>> 0;
              h -= n;
              n += h * 4294967296;
            }
            return (n >>> 0) * 23283064365386963e-26;
          };
          mash.version = "Mash 0.9";
          return mash;
        }
        function _isInteger(_int) {
          return parseInt(_int, 10) === _int;
        }
        var random = function() {
          var t = 2091639 * s0 + c * 23283064365386963e-26;
          s0 = s1;
          s1 = s2;
          return s2 = t - (c = t | 0);
        };
        random.fract53 = function() {
          return random() + (random() * 2097152 | 0) * 11102230246251565e-32;
        };
        random.int32 = function() {
          return random() * 4294967296;
        };
        random.cycle = function(_run) {
          _run = typeof _run === "undefined" ? 1 : +_run;
          if (_run < 1) {
            _run = 1;
          }
          for (var i = 0; i < _run; i++) {
            random();
          }
        };
        random.range = function() {
          var loBound, hiBound;
          if (arguments.length === 1) {
            loBound = 0;
            hiBound = arguments[0];
          } else {
            loBound = arguments[0];
            hiBound = arguments[1];
          }
          if (arguments[0] > arguments[1]) {
            loBound = arguments[1];
            hiBound = arguments[0];
          }
          if (_isInteger(loBound) && _isInteger(hiBound)) {
            return Math.floor(random() * (hiBound - loBound + 1)) + loBound;
          } else {
            return random() * (hiBound - loBound) + loBound;
          }
        };
        random.restart = function() {
          _initState(initialArgs);
        };
        random.seed = function() {
          _initState(Array.prototype.slice.call(arguments));
        };
        random.version = function() {
          return version;
        };
        random.versions = function() {
          return version + ", " + mashver;
        };
        if (args.length === 0) {
          window.crypto.getRandomValues(uinta);
          args = [uinta[0], uinta[1], uinta[2]];
        }
        initialArgs = args;
        _initState(args);
        return random;
      })(Array.prototype.slice.call(arguments));
    }
    module.exports = aleaPRNG;
  }
});

// .armoria-build/generator.js
var require_generator = __commonJS({
  ".armoria-build/generator.js"(exports, module) {
    var { shields, charges, divisions, lines, ordinaries, positions, tinctures, patternSize } = require_dataModel();
    var aleaPRNG = require_alea();
    var createConfig = () => ({
      usedPattern: null,
      usedTinctures: [],
      tData: tinctures,
      divisioned: null,
      ordinary: null
    });
    var generate = function(providedSeed) {
      const seed = providedSeed || Math.floor(Math.random() * 1e9);
      Math.random = aleaPRNG(seed);
      const config = createConfig();
      const coa = { seed, t1: getTincture(config, "field") };
      const addCharge = P(config.usedPattern ? 0.5 : 0.93);
      const linedOrdinary = addCharge && P(0.3) || P(0.5) ? rw(ordinaries.lined) : null;
      config.ordinary = !addCharge && P(0.65) || P(0.3) ? linedOrdinary ? linedOrdinary : rw(ordinaries.straight) : null;
      const rareDivided = ["chief", "terrace", "chevron", "quarter", "flaunches"].includes(config.ordinary);
      config.divisioned = rareDivided ? P(0.03) : addCharge && config.ordinary ? P(0.03) : addCharge ? P(0.3) : config.ordinary ? P(0.7) : P(0.995);
      const division = config.divisioned ? rw(divisions.variants) : null;
      if (division) {
        const t = getTincture(config, "division", config.usedTinctures, P(0.98) ? coa.t1 : null);
        coa.division = { division, t };
        if (divisions[division])
          coa.division.line = config.usedPattern || config.ordinary && P(0.7) ? "straight" : rw(divisions[division]);
      }
      if (config.ordinary) {
        const t = getTincture(config, "charge", config.usedTinctures, coa.t1);
        coa.ordinaries = [{ ordinary: config.ordinary, t }];
        if (linedOrdinary) coa.ordinaries[0].line = config.usedPattern || division && P(0.7) ? "straight" : rw(lines);
        if (division && !addCharge && !config.usedPattern && P(0.5) && config.ordinary !== "bordure" && config.ordinary !== "orle") {
          if (P(0.8)) coa.ordinaries[0].divided = "counter";
          else if (P(0.6)) coa.ordinaries[0].divided = "field";
          else coa.ordinaries[0].divided = "division";
        }
      }
      if (addCharge) {
        const charge = selectCharge(config.ordinary || config.divisioned ? charges.types : charges.single);
        const chargeData = charges.data[charge] || {};
        let p = "e";
        let t = "gules";
        const ordinaryData = ordinaries.data[config.ordinary];
        const tOrdinary = coa.ordinaries ? coa.ordinaries[0].t : null;
        if (ordinaryData?.positionsOn && P(0.8)) {
          p = rw(ordinaryData.positionsOn);
          t = !config.usedPattern && P(0.3) ? coa.t1 : getTincture(config, "charge", [], tOrdinary);
        } else if (ordinaryData?.positionsOff && P(0.95)) {
          p = rw(ordinaryData.positionsOff);
          t = !config.usedPattern && P(0.3) ? tOrdinary : getTincture(config, "charge", config.usedTinctures, coa.t1);
        } else if (positions.divisions[division]) {
          p = rw(positions.divisions[division]);
          t = getTincture(
            config,
            "charge",
            tOrdinary ? config.usedTinctures.concat(tOrdinary) : config.usedTinctures,
            coa.t1
          );
        } else if (chargeData.positions) {
          p = rw(chargeData.positions);
          t = getTincture(config, "charge", config.usedTinctures, coa.t1);
        } else {
          p = config.usedPattern ? "e" : charges.conventional[charge] ? rw(positions.conventional) : rw(positions.complex);
          t = getTincture(config, "charge", config.usedTinctures.concat(tOrdinary), coa.t1);
        }
        if (chargeData.natural && chargeData.natural !== t && chargeData.natural !== tOrdinary) t = chargeData.natural;
        const item = { charge, t, p };
        const colors = chargeData.colors || 1;
        if (colors > 1) item.t2 = P(0.25) ? getTincture(config, "charge", config.usedTinctures, coa.t1) : t;
        if (colors > 2 && item.t2) item.t3 = P(0.5) ? getTincture(config, "charge", config.usedTinctures, coa.t1) : t;
        coa.charges = [item];
        if (p === "ABCDEFGHIKL" && P(0.95)) {
          coa.charges[0].charge = rw(charges.conventional);
          const charge2 = selectCharge(charges.single);
          const t2 = getTincture(config, "charge", config.usedTinctures, coa.t1);
          coa.charges.push({ charge: charge2, t: t2, p: "e" });
        } else if (P(0.8) && charge === "inescutcheon") {
          const charge2 = selectCharge(charges.types);
          const t2 = getTincture(config, "charge", [], t);
          coa.charges.push({ charge: charge2, t: t2, p, size: 0.5 });
        } else if (division && !config.ordinary) {
          const allowCounter = !config.usedPattern && (!coa.line || coa.line === "straight");
          if (P(0.3) && ["perPale", "perFess"].includes(division) && coa.line === "straight") {
            coa.charges[0].divided = "field";
            if (P(0.95)) {
              const p2 = p === "e" || P(0.5) ? "e" : rw(positions.divisions[division]);
              const charge2 = selectCharge(charges.single);
              const t2 = getTincture(config, "charge", config.usedTinctures, coa.division.t);
              coa.charges.push({ charge: charge2, t: t2, p: p2, divided: "division" });
            }
          } else if (allowCounter && P(0.4)) coa.charges[0].divided = "counter";
          else if (["perPale", "perFess", "perBend", "perBendSinister"].includes(division) && P(0.8)) {
            const [p1, p2] = division === "perPale" ? ["p", "q"] : division === "perFess" ? ["k", "n"] : division === "perBend" ? ["l", "m"] : ["j", "o"];
            coa.charges[0].p = p1;
            const charge2 = selectCharge(charges.single);
            const t2 = getTincture(config, "charge", config.usedTinctures, coa.division.t);
            coa.charges.push({ charge: charge2, t: t2, p: p2 });
          } else if (["perCross", "perSaltire"].includes(division) && P(0.5)) {
            const [p1, p2, p3, p4] = division === "perCross" ? ["j", "l", "m", "o"] : ["b", "d", "f", "h"];
            coa.charges[0].p = p1;
            const c2 = selectCharge(charges.single);
            const t2 = getTincture(config, "charge", [], coa.division.t);
            const c3 = selectCharge(charges.single);
            const t3 = getTincture(config, "charge", [], coa.division.t);
            const c4 = selectCharge(charges.single);
            const t4 = getTincture(config, "charge", [], coa.t1);
            coa.charges.push({ charge: c2, t: t2, p: p2 }, { charge: c3, t: t3, p: p3 }, { charge: c4, t: t4, p: p4 });
          } else if (allowCounter && p.length > 1) coa.charges[0].divided = "counter";
        }
        coa.charges.forEach((c) => defineChargeAttributes(config, division, c));
      }
      return coa;
    };
    var getSize = (p, o = null, d = null) => {
      if (p === "e" && (o === "bordure" || o === "orle")) return 1.1;
      if (p === "e") return 1.5;
      if (p === "jln" || p === "jlh") return 0.7;
      if (p === "abcpqh" || p === "ez" || p === "be") return 0.5;
      if (["a", "b", "c", "d", "f", "g", "h", "i", "bh", "df"].includes(p)) return 0.5;
      if (["j", "l", "m", "o", "jlmo"].includes(p) && d === "perCross") return 0.6;
      if (p.length > 10) return 0.18;
      if (p.length > 7) return 0.3;
      if (p.length > 4) return 0.4;
      if (p.length > 2) return 0.5;
      return 0.7;
    };
    function defineChargeAttributes(config, division, c) {
      c.size = (c.size || 1) * getSize(c.p, config.ordinary, division);
      c.p = [...new Set(c.p)].join("");
      if (P(0.02) && charges.data[c.charge]?.sinister) c.sinister = 1;
      if (P(0.02) && charges.data[c.charge]?.reversed) c.reversed = 1;
    }
    function selectCharge(set) {
      const type = rw(set);
      return type === "inescutcheon" ? "inescutcheon" : rw(charges[type]);
    }
    function replaceTincture(config, tincture) {
      const type = getType(config, tincture);
      const typeTinctures = config.tData[type];
      const candidateTinctures = { ...typeTinctures };
      delete candidateTinctures[tincture];
      const newTincture = rw(candidateTinctures, false);
      if (!newTincture) {
        console.warn(`Type ${type} has only one valid tincture. Cannot follow the Rule of Tincture`);
        return tincture;
      }
      return rw(candidateTinctures, false);
    }
    function getType(config, t) {
      const tincture = getBaseTincture(t);
      if (Object.keys(config.tData.metals).includes(tincture)) return "metals";
      if (Object.keys(config.tData.colours).includes(tincture)) return "colours";
      if (Object.keys(config.tData.stains).includes(tincture)) return "stains";
      throw new Error("Unknown tincture type", t);
    }
    function definePattern(config, patternName, element) {
      let t1 = null;
      let t2 = null;
      if (P(0.5) && (patternName.includes("air") || patternName.includes("otent"))) {
        t1 = "argent";
        t2 = "azure";
      } else if (patternName === "ermine") {
        if (P(0.7)) {
          t1 = "argent";
          t2 = "sable";
        } else if (P(0.3)) {
          t1 = "sable";
          t2 = "argent";
        } else if (P(0.1)) {
          t1 = "or";
          t2 = "sable";
        } else if (P(0.1)) {
          t1 = "sable";
          t2 = "or";
        } else if (P(0.1)) {
          t1 = "gules";
          t2 = "argent";
        }
      } else if (patternName.includes("pappellony") || patternName === "scaly") {
        if (P(0.2)) {
          t1 = "gules";
          t2 = "or";
        } else if (P(0.2)) {
          t1 = "sable";
          t2 = "argent";
        } else if (P(0.2)) {
          t1 = "argent";
          t2 = "sable";
        } else if (P(0.2)) {
          t1 = "azure";
          t2 = "argent";
        }
      } else if (P(0.2) && patternName === "plumetty") {
        t1 = "gules";
        t2 = "or";
      } else if (patternName === "masoned") {
        if (P(0.3)) {
          t1 = "gules";
          t2 = "argent";
        } else if (P(0.3)) {
          t1 = "argent";
          t2 = "sable";
        } else if (P(0.1)) {
          t1 = "or";
          t2 = "sable";
        }
      } else if (patternName === "fretty" || patternName === "grillage" || patternName === "chainy") {
        if (P(0.35)) {
          t1 = "argent";
          t2 = "gules";
        } else if (P(0.1)) {
          t1 = "sable";
          t2 = "or";
        } else if (P(0.2)) {
          t1 = "gules";
          t2 = "argent";
        }
      } else if (patternName === "honeycombed") {
        if (P(0.4)) {
          t1 = "sable";
          t2 = "or";
        } else if (P(0.3)) {
          t1 = "or";
          t2 = "sable";
        }
      } else if (patternName === "semy") patternName += "_of_" + selectCharge(charges.semy);
      if (!t1 || !t2) {
        const startWithMetal = P(0.7);
        t1 = startWithMetal ? rw(config.tData.metals) : rw(config.tData.colours);
        t2 = startWithMetal ? rw(config.tData.colours) : rw(config.tData.metals);
      }
      if (element === "division") {
        if (config.usedTinctures.includes(t1)) t1 = replaceTincture(config, t1);
        if (config.usedTinctures.includes(t2)) t2 = replaceTincture(config, t2);
      }
      config.usedTinctures.push(t1, t2);
      const size = rw(patternSize);
      const sizeString = size === "standard" ? "" : "-" + size;
      return `${patternName}-${t1}-${t2}${sizeString}`;
    }
    function getBaseTincture(tincture) {
      return tincture.includes("-") ? tincture.split("-")[1] : tincture;
    }
    function excludeTinctures(typeTinctures, usedTinctures) {
      const unusedTinctures = { ...typeTinctures };
      usedTinctures.forEach((usedTincture) => {
        delete unusedTinctures[usedTincture];
      });
      const isAnyUnused = Object.keys(unusedTinctures).length && Object.values(unusedTinctures).reduce((a, b) => a + b, 0);
      return isAnyUnused ? unusedTinctures : typeTinctures;
    }
    function getTincture(config, element, fields = [], RoT) {
      let type = rw(config.tData[element]);
      if (type === "patterns") {
        const patternName = rw(config.tData[type]);
        config.usedPattern = patternName;
        const tincture2 = definePattern(config, patternName, element);
        return tincture2;
      }
      if (RoT) {
        const underlyingTincture = getBaseTincture(RoT);
        const underlyingType = getType(config, underlyingTincture);
        type = underlyingType === "metals" ? "colours" : "metals";
      }
      const typeTinctures = config.tData[type];
      const candidateTinctures = fields.length ? excludeTinctures(typeTinctures, fields) : typeTinctures;
      let tincture = rw(candidateTinctures, false);
      if (element !== "charge") config.usedTinctures.push(tincture);
      return tincture;
    }
    var rw = function(object) {
      if (!object.array) {
        const array = [];
        for (const key in object) {
          for (let i = 0; i < object[key]; i++) {
            array.push(key);
          }
        }
        Object.defineProperty(object, "array", { enumerable: false, configurable: true, writable: false, value: array });
      }
      return object.array[Math.floor(Math.random() * object.array.length)];
    };
    var P = function(probability) {
      return Math.random() < probability;
    };
    module.exports = generate;
  }
});

// .armoria-build/index.js
var require_index = __commonJS({
  ".armoria-build/index.js"(exports, module) {
    var { draw, setChargesBasePath } = require_renderer();
    var generate = require_generator();
    module.exports = { draw, setChargesBasePath, generate };
  }
});
export default require_index();
