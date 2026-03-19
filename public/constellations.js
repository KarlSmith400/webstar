// Constellation line data using HYG v41 IAU proper star names
// Each constellation is an array of line segments [starA, starB]
export const CONSTELLATIONS = [

  // === NORTHERN ===

  { name: 'Orion', lines: [
    ['Betelgeuse','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],
    ['Alnilam','Alnitak'],['Alnitak','Saiph'],['Saiph','Rigel'],
    ['Rigel','Mintaka'],['Betelgeuse','Alnitak'],['Bellatrix','Meissa'],
  ]},

  { name: 'Ursa Major', lines: [
    ['Dubhe','Merak'],['Merak','Phad'],['Phad','Megrez'],['Megrez','Dubhe'],
    ['Megrez','Alioth'],['Alioth','Mizar'],['Mizar','Alkaid'],
    ['Dubhe','Muscida'],['Muscida','Alkaphrah'],['Alkaphrah','Tania Borealis'],
    ['Tania Borealis','Tania Australis'],['Tania Australis','Alula Borealis'],
    ['Alula Borealis','Alula Australis'],
  ]},

  { name: 'Ursa Minor', lines: [
    ['Kochab','Pherkad'],['Pherkad','Yildun'],['Yildun','Polaris'],
  ]},

  { name: 'Cassiopeia', lines: [
    ['Caph','Schedar'],['Schedar','Cih'],['Cih','Ruchbah'],['Ruchbah','Segin'],
  ]},

  { name: 'Cepheus', lines: [
    ['Alderamin','Alfirk'],['Alfirk','Errai'],['Errai','Alderamin'],
    ['Alderamin','Kurhah'],['Kurhah','Castula'],
  ]},

  { name: 'Draco', lines: [
    ['Eltanin','Rastaban'],['Rastaban','Grumium'],['Grumium','Eltanin'],
    ['Grumium','Aldhibah'],['Aldhibah','Athebyne'],['Athebyne','Edasich'],
    ['Edasich','Giausar'],['Giausar','Thuban'],['Thuban','Altais'],
    ['Altais','Tyl'],['Tyl','Rastaban'],['Giausar','Dziban'],
  ]},

  { name: 'Perseus', lines: [
    ['Mirfak','Algol'],['Mirfak','Miram'],['Mirfak','Menkib'],['Mirfak','Misam'],
  ]},

  { name: 'Auriga', lines: [
    ['Capella','Menkalinan'],['Menkalinan','Mahasim'],
    ['Mahasim','Hassaleh'],['Hassaleh','Capella'],
    ['Capella','Haedus'],['Hassaleh','Elnath'],
  ]},

  { name: 'Andromeda', lines: [
    ['Alpheratz','Mirach'],['Mirach','Almach'],
    ['Alpheratz','Adhil'],['Mirach','Nembus'],
  ]},

  { name: 'Pegasus', lines: [
    ['Markab','Scheat'],['Scheat','Alpheratz'],['Alpheratz','Algenib'],['Algenib','Markab'],
    ['Markab','Homam'],['Homam','Matar'],['Matar','Scheat'],
    ['Markab','Sadalbari'],['Sadalbari','Biham'],['Enif','Homam'],
  ]},

  { name: 'Triangulum', lines: [
    ['Mothallah','Mirach'],['Mothallah','Hamal'],
  ]},

  { name: 'Bootes', lines: [
    ['Arcturus','Muphrid'],['Arcturus','Izar'],['Izar','Nekkar'],
    ['Izar','Seginus'],['Izar','Alkalurops'],
  ]},

  { name: 'Corona Borealis', lines: [
    ['Alphecca','Nusakan'],
  ]},

  { name: 'Hercules', lines: [
    ['Rasalgethi','Kornephoros'],['Kornephoros','Sarin'],
    ['Sarin','Maasym'],['Maasym','Marsic'],['Marsic','Cujam'],
    ['Sarin','Marfik'],
  ]},

  { name: 'Lyra', lines: [
    ['Vega','Sheliak'],['Sheliak','Sulafat'],['Sulafat','Vega'],
  ]},

  { name: 'Cygnus', lines: [
    ['Deneb','Sadr'],['Sadr','Albireo'],['Sadr','Fawaris'],
    ['Sadr','Gienah Cyg'],['Fawaris','Aljanah'],
  ]},

  { name: 'Aquila', lines: [
    ['Altair','Tarazed'],['Altair','Alshain'],['Altair','Okab'],
  ]},

  { name: 'Sagitta', lines: [
    ['Sham','Anser'],
  ]},

  { name: 'Delphinus', lines: [
    ['Sualocin','Rotanev'],
  ]},

  { name: 'Serpens', lines: [
    ['Unukalhai','Alya'],
  ]},

  // === ZODIAC ===

  { name: 'Aries', lines: [
    ['Hamal','Sheratan'],['Sheratan','Mesarthim'],['Hamal','Botein'],
  ]},

  { name: 'Taurus', lines: [
    ['Aldebaran','Ain'],['Aldebaran','Tianguan'],['Aldebaran','Elnath'],
    ['Aldebaran','Prima Hyadum'],['Prima Hyadum','Secunda Hyadum'],['Secunda Hyadum','Ain'],
  ]},

  { name: 'Gemini', lines: [
    ['Castor','Pollux'],['Castor','Mebsuda'],['Mebsuda','Tejat'],
    ['Pollux','Alhena'],['Alhena','Propus'],['Propus','Tejat'],
    ['Castor','Alzirr'],
  ]},

  { name: 'Cancer', lines: [
    ['Acubens','Tarf'],['Tarf','Asellus Australis'],
    ['Asellus Australis','Asellus Borealis'],['Asellus Borealis','Tegmine'],
  ]},

  { name: 'Leo', lines: [
    ['Regulus','Algieba'],['Algieba','Zosma'],['Zosma','Denebola'],
    ['Algieba','Adhafera'],['Adhafera','Rasalas'],
    ['Zosma','Chertan'],['Denebola','Subra'],
  ]},

  { name: 'Virgo', lines: [
    ['Spica','Porrima'],['Porrima','Vindemiatrix'],['Porrima','Zaniah'],
    ['Spica','Heze'],['Heze','Minelauva'],['Minelauva','Porrima'],
    ['Vindemiatrix','Zavijava'],['Spica','Syrma'],['Syrma','Khambalia'],
  ]},

  { name: 'Libra', lines: [
    ['Zubenelgenubi','Zubeneschamali'],['Zubeneschamali','Brachium'],
    ['Zubenelgenubi','Zubenelhakrabi'],
  ]},

  { name: 'Scorpius', lines: [
    ['Antares','Graffias'],['Antares','Dschubba'],['Dschubba','Graffias'],
    ['Antares','Larawag'],['Larawag','Sargas'],['Sargas','Shaula'],['Shaula','Lesath'],
    ['Graffias','Jabbah'],['Jabbah','Acrab'],['Antares','Iklil'],
  ]},

  { name: 'Ophiuchus', lines: [
    ['Rasalhague','Cebalrai'],['Rasalhague','Yed Prior'],
    ['Yed Prior','Yed Posterior'],['Yed Posterior','Sabik'],
    ['Sabik','Han'],['Cebalrai','Marfik'],
  ]},

  { name: 'Sagittarius', lines: [
    ['Kaus Australis','Kaus Media'],['Kaus Media','Kaus Borealis'],
    ['Kaus Australis','Ascella'],['Ascella','Nunki'],['Nunki','Kaus Media'],
    ['Kaus Media','Alnasl'],['Alnasl','Kaus Borealis'],
    ['Kaus Australis','Arkab Prior'],['Arkab Prior','Arkab Posterior'],
    ['Nunki','Terebellum'],
  ]},

  { name: 'Capricornus', lines: [
    ['Algedi','Dabih'],['Dabih','Nashira'],['Nashira','Deneb Algedi'],
    ['Deneb Algedi','Alshat'],['Alshat','Algedi'],
  ]},

  { name: 'Aquarius', lines: [
    ['Sadachbia','Skat'],['Skat','Ancha'],['Ancha','Albali'],
    ['Sadachbia','Situla'],['Situla','Bunda'],
  ]},

  { name: 'Pisces', lines: [
    ['Alrescha','Fumalsamakah'],['Alrescha','Alpherg'],
    ['Alrescha','Revati'],['Fumalsamakah','Torcular'],
  ]},

  // === SOUTHERN ===

  { name: 'Canis Major', lines: [
    ['Sirius','Mirzam'],['Sirius','Muliphein'],['Sirius','Adhara'],
    ['Adhara','Wezen'],['Wezen','Aludra'],['Adhara','Furud'],
  ]},

  { name: 'Canis Minor', lines: [
    ['Procyon','Gomeisa'],
  ]},

  { name: 'Eridanus', lines: [
    ['Cursa','Zaurak'],['Zaurak','Rana'],['Rana','Azha'],
    ['Azha','Angetenar'],['Angetenar','Zibal'],['Zibal','Beid'],
    ['Beid','Keid'],['Keid','Acamar'],['Acamar','Theemin'],
    ['Theemin','Beemim'],['Beemim','Achernar'],['Acamar','Dalim'],
  ]},

  { name: 'Columba', lines: [
    ['Phact','Wazn'],
  ]},

  { name: 'Hydra', lines: [
    ['Alphard','Minchir'],['Minchir','Ashlesha'],['Ashlesha','Ukdah'],
  ]},

  { name: 'Corvus', lines: [
    ['Alchiba','Algorab'],['Algorab','Gienah'],['Gienah','Kraz'],['Kraz','Algorab'],
  ]},

  { name: 'Centaurus', lines: [
    ['Rigil Kentaurus','Hadar'],['Hadar','Menkent'],
  ]},

  { name: 'Crux', lines: [
    ['Acrux','Mimosa'],['Gacrux','Imai'],
  ]},

  { name: 'Grus', lines: [
    ['Alnair','Tiaki'],['Tiaki','Aldhanab'],
  ]},

  { name: 'Pavo', lines: [
    ['Peacock','Tiaki'],
  ]},

];
