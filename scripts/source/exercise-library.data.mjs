/* Extracted verbatim from the Exercise Library artifact (claude.ai/artifact/DJPouQiVG525rnyJpqREZr),
   lines 156-743. Data only - no behaviour. Do not hand-edit; see scripts/extract-data.mjs. */
const GROUPS = {
  chest:['Chest','#D49696'], shoulders:['Shoulders','#B596D4'], traps:['Traps','#96D4D4'],
  biceps:['Biceps','#D1C399'], triceps:['Triceps','#8A82C8'], forearms:['Forearms','#B5D199'],
  lats:['Lats','#D496C5'], midback:['Middle back','#CA997D'], abs:['Abs','#96D4A6'],
  obliques:['Obliques','#7DADCA'], lowback:['Lower back','#BDC680'], glutes:['Glutes','#CA7D99'],
  quads:['Quads','#96A6D4'], adductors:['Adductors','#9CC48F'], hamstrings:['Hamstrings','#BF85C8'],
  calves:['Calves','#86C2AE']
};
const MUSCLES = {
  pc:['Pectoralis major (clavicular head)','chest'], ps:['Pectoralis major (sternocostal head)','chest'],
  da:['Deltoid (anterior)','shoulders'], dl:['Deltoid (lateral)','shoulders'], dp:['Deltoid (posterior)','shoulders'],
  tu:['Trapezius (descending / upper)','traps'], tm:['Trapezius (transverse / middle)','traps'], tlw:['Trapezius (ascending / lower)','traps'],
  rh:['Rhomboid major & minor','midback'], inf:['Infraspinatus','midback'], tn:['Teres minor','midback'], tj:['Teres major','midback'],
  la:['Latissimus dorsi','lats'],
  es:['Erector spinae (iliocostalis & longissimus)','lowback'],
  ra:['Rectus abdominis','abs'],
  eo:['External oblique','obliques'], sa:['Serratus anterior','obliques'],
  bl:['Biceps brachii (long head)','biceps'], bs:['Biceps brachii (short head)','biceps'], br:['Brachialis','biceps'],
  tlo:['Triceps brachii (long head)','triceps'], tla:['Triceps brachii (lateral head)','triceps'], tme:['Triceps brachii (medial head)','triceps'],
  brd:['Brachioradialis','forearms'], fcr:['Flexor carpi radialis','forearms'], fcu:['Flexor carpi ulnaris','forearms'],
  plm:['Palmaris longus','forearms'], fds:['Flexor digitorum superficialis','forearms'], pt:['Pronator teres','forearms'],
  ecr:['Extensor carpi radialis (longus & brevis)','forearms'], exd:['Extensor digitorum','forearms'], ecu:['Extensor carpi ulnaris','forearms'],
  gx:['Gluteus maximus','glutes'], gm:['Gluteus medius','glutes'], tfl:['Tensor fasciae latae','glutes'],
  rf:['Rectus femoris','quads'], vl:['Vastus lateralis','quads'], vm:['Vastus medialis','quads'], sar:['Sartorius','quads'],
  al:['Adductor longus','adductors'], pec:['Pectineus','adductors'], gr:['Gracilis','adductors'], am:['Adductor magnus','adductors'],
  bfl:['Biceps femoris (long head)','hamstrings'], bfs:['Biceps femoris (short head)','hamstrings'],
  st:['Semitendinosus','hamstrings'], sm:['Semimembranosus','hamstrings'],
  gmh:['Gastrocnemius (medial head)','calves'], glh:['Gastrocnemius (lateral head)','calves'], so:['Soleus','calves'],
  ta:['Tibialis anterior','calves'], edl:['Extensor digitorum longus','calves'], fl:['Fibularis longus','calves']
};
// shorthand for whole muscles
const MACRO = { PEC:'pc ps', TRI:'tlo tla tme', BI:'bl bs', Q:'rf vl vm', HAM:'bfl bfs st sm', GAS:'gmh glh', GRIP:'fds fcu fcr' };
const EQUIP = {
  bb:'Olympic barbell', pl:'Iron / rubber-coated plates', bump:'Bumper plates', db:'Dumbbells (fixed)', kb:'Kettlebells',
  ez:'EZ curl bar', hex:'Trap / hex bar', fb:'Flat bench', ab:'Adjustable (FID) bench', dec:'Decline bench',
  prb:'Preacher curl bench', rack:'Power rack / squat cage', smith:'Smith machine', pub:'Pull-up bar',
  dip:'Dip station / parallel bars', be:'45° back extension', ghd:'GHD (glute-ham developer)', lm:'Landmine attachment',
  cc:'Cable crossover station', lpd:'Lat pulldown', scr:'Seated cable row', catt:'Cable attachments',
  cpm:'Chest press machine', pd:'Pec deck / rear delt fly', spm:'Shoulder press machine', tbar:'T-bar / chest-supported row',
  lp:'Leg press', hs:'Hack squat', le:'Leg extension', lc:'Leg curl (lying or seated)', hab:'Hip abductor / adductor',
  crm:'Calf raise machine', mb:'Medicine ball', rings:'Gymnastic rings', par:'Parallettes', awh:'Ab wheel',
  mat:'Exercise / yoga mat', box:'Plyo box', jr:'Jump rope', ropes:'Battle ropes', band:'Loop resistance bands'
};
// c: G gym, B bodyweight, C calisthenics · l: 1 pemula, 2 menengah, 3 lanjut
// e: equipment codes ('?' = opsional) · p: otot utama · s: otot pendukung · st: langkah
const SECTIONS = [
 ['Dada', [
  {n:'Barbell Bench Press', c:'G', l:2, e:'bb pl fb rack', p:'ps pc', s:'da TRI sa', st:[
   'Berbaring di flat bench dengan mata tepat di bawah barbell, kedua kaki menapak di lantai.',
   'Genggam bar sedikit lebih lebar dari bahu, tarik tulang belikat ke belakang dan ke bawah.',
   'Angkat bar dari rack dan tahan di atas dada dengan lengan lurus.',
   'Turunkan bar perlahan hingga menyentuh dada bagian tengah-bawah, siku sekitar 45–70° dari badan.',
   'Dorong bar kembali ke atas hingga lengan lurus, lalu ulangi. Kembalikan bar ke rack setelah selesai.']},
  {n:'Incline Barbell Bench Press', c:'G', l:2, e:'bb pl ab rack', p:'pc', s:'ps da TRI', st:[
   'Atur sandaran bench di sudut 30–45°, lalu berbaring dengan mata di bawah barbell.',
   'Genggam bar sedikit lebih lebar dari bahu dan rapatkan tulang belikat.',
   'Angkat bar dari rack, tahan di atas dada atas dengan lengan lurus.',
   'Turunkan bar ke dada atas (di bawah tulang selangka) secara terkontrol.',
   'Dorong kembali ke atas tanpa mengangkat pinggul dari bench.']},
  {n:'Decline Bench Press', c:'G', l:2, e:'bb pl dec', p:'ps', s:'pc TRI da', st:[
   'Kaitkan kaki di bantalan decline bench, lalu berbaring dengan kepala lebih rendah dari pinggul.',
   'Genggam bar sedikit lebih lebar dari bahu dan angkat dari rack.',
   'Turunkan bar ke dada bagian bawah dengan siku sedikit menekuk ke arah badan.',
   'Dorong bar ke atas hingga lengan lurus, lalu ulangi.']},
  {n:'Dumbbell Bench Press', c:'G', l:1, e:'db fb', p:'ps pc', s:'da TRI', st:[
   'Duduk di ujung bench dengan dumbbell di paha, lalu berbaring sambil membawa dumbbell ke samping dada.',
   'Posisikan dumbbell sejajar dada, telapak menghadap ke arah kaki, tulang belikat rapat.',
   'Dorong kedua dumbbell ke atas hingga lengan lurus dan dumbbell hampir bertemu.',
   'Turunkan perlahan hingga siku sedikit di bawah bench, lalu ulangi.']},
  {n:'Incline Dumbbell Press', c:'G', l:1, e:'db ab', p:'pc', s:'ps da TRI', st:[
   'Atur bench di sudut 30–45°, duduk dan bawa dumbbell ke depan bahu.',
   'Bersandar dengan punggung dan kepala menempel di bench, kaki menapak.',
   'Dorong dumbbell ke atas dada atas hingga lengan lurus.',
   'Turunkan perlahan hingga dumbbell sejajar dada atas, lalu ulangi.']},
  {n:'Dumbbell Fly', c:'G', l:1, e:'db fb', p:'ps pc', s:'da bs', st:[
   'Berbaring di flat bench, tahan dumbbell di atas dada dengan telapak saling berhadapan.',
   'Tekuk siku sedikit dan pertahankan sudut itu sepanjang gerakan.',
   'Buka lengan ke samping dalam lengkungan lebar sampai dada terasa meregang.',
   'Rapatkan kembali dumbbell di atas dada seperti memeluk pohon, lalu ulangi.']},
  {n:'Cable Crossover', c:'G', l:2, e:'cc catt', p:'ps', s:'pc da sa', st:[
   'Pasang D-handle di kedua pulley posisi tinggi, pegang satu di tiap tangan.',
   'Melangkah ke depan dengan satu kaki, condongkan badan sedikit, siku sedikit menekuk.',
   'Tarik kedua handle ke bawah dan ke tengah hingga bertemu di depan pinggul.',
   'Tahan sebentar sambil meremas dada, lalu kembalikan perlahan ke posisi awal.']},
  {n:'Pec Deck Fly', c:'G', l:1, e:'pd', p:'ps pc', s:'da', st:[
   'Atur tinggi kursi agar handle sejajar dada, lalu duduk dengan punggung menempel sandaran.',
   'Pegang handle dengan siku sedikit menekuk.',
   'Rapatkan kedua lengan ke depan hingga handle hampir bertemu.',
   'Kembalikan perlahan sampai dada terasa meregang, lalu ulangi.']},
  {n:'Machine Chest Press', c:'G', l:1, e:'cpm', p:'ps pc', s:'da TRI', st:[
   'Atur kursi agar handle sejajar dada tengah, duduk dengan punggung menempel.',
   'Genggam handle, tulang belikat rapat ke sandaran.',
   'Dorong handle ke depan hingga lengan hampir lurus.',
   'Kembalikan perlahan sampai siku sedikit di belakang badan, lalu ulangi.']},
  {n:'Push-up', c:'BC', l:1, e:'mat?', p:'ps pc', s:'da TRI sa ra', st:[
   'Posisi plank tinggi: telapak tangan di lantai sedikit lebih lebar dari bahu, badan lurus dari kepala ke tumit.',
   'Kencangkan perut dan bokong agar pinggul tidak turun.',
   'Tekuk siku (sekitar 45° dari badan) dan turunkan dada hingga hampir menyentuh lantai.',
   'Dorong lantai hingga lengan lurus kembali, lalu ulangi.']},
  {n:'Diamond Push-up', c:'BC', l:2, e:'mat?', p:'tla tme tlo', s:'ps pc da', st:[
   'Posisi plank tinggi dengan kedua tangan di bawah dada, ibu jari dan telunjuk membentuk berlian.',
   'Jaga badan lurus dan perut kencang.',
   'Turunkan dada ke arah tangan dengan siku tetap dekat badan.',
   'Dorong kembali ke atas hingga lengan lurus.']},
  {n:'Archer Push-up', c:'C', l:3, e:'mat?', p:'ps pc', s:'TRI da sa eo', st:[
   'Posisi push-up dengan tangan dibuka sangat lebar.',
   'Turunkan badan ke arah satu tangan sambil tangan lain lurus ke samping.',
   'Dorong kembali ke tengah, lalu ulangi ke sisi lain.',
   'Jaga pinggul tetap sejajar dan tidak berputar.']},
  {n:'Pseudo Planche Push-up', c:'C', l:3, e:'par?', p:'da pc', s:'TRI sa ra BI', st:[
   'Posisi push-up dengan tangan di samping pinggang, jari menghadap ke samping atau belakang.',
   'Condongkan badan ke depan hingga bahu jauh melewati tangan.',
   'Turunkan dada sambil mempertahankan condong ke depan dan badan lurus.',
   'Dorong kembali ke atas tanpa mengurangi condong, lalu ulangi.']},
  {n:'Chest Dip', c:'GC', l:2, e:'dip', p:'ps', s:'TRI da pc', st:[
   'Pegang parallel bar dan angkat badan hingga lengan lurus.',
   'Condongkan badan ke depan sekitar 30° dan tekuk lutut ke belakang.',
   'Turunkan badan dengan menekuk siku hingga bahu sedikit di bawah siku.',
   'Dorong kembali ke atas hingga lengan lurus.']},
  {n:'Ring Dip', c:'C', l:3, e:'rings', p:'ps TRI', s:'da pc sa BI', st:[
   'Pegang ring dan naik ke posisi support dengan lengan lurus, ring rapat ke badan.',
   'Putar ring sedikit keluar untuk menstabilkan bahu.',
   'Turunkan badan perlahan hingga bahu sejajar siku, jaga ring tetap dekat badan.',
   'Dorong kembali ke posisi support, lalu ulangi.']}
 ]],
 ['Punggung', [
  {n:'Pull-up', c:'BC', l:2, e:'pub', p:'la tj', s:'BI br brd tlw rh dp', st:[
   'Gantung di bar dengan genggaman overhand sedikit lebih lebar dari bahu.',
   'Tarik bahu ke bawah menjauhi telinga dan kencangkan perut.',
   'Tarik badan ke atas hingga dagu melewati bar, siku mengarah ke bawah.',
   'Turunkan perlahan hingga lengan lurus penuh, lalu ulangi.']},
  {n:'Chin-up', c:'BC', l:2, e:'pub', p:'la bs bl', s:'br tj tlw rh', st:[
   'Gantung di bar dengan genggaman underhand selebar bahu.',
   'Tarik bahu ke bawah dan kencangkan perut.',
   'Tarik badan ke atas hingga dagu melewati bar.',
   'Turunkan perlahan hingga lengan lurus, lalu ulangi.']},
  {n:'Lat Pulldown', c:'G', l:1, e:'lpd catt', p:'la tj', s:'BI br tlw rh dp', st:[
   'Duduk dengan paha terkunci di bawah bantalan, genggam bar lebih lebar dari bahu.',
   'Condongkan badan sedikit ke belakang dan busungkan dada.',
   'Tarik bar ke dada atas sambil menarik siku ke bawah dan ke belakang.',
   'Kembalikan bar perlahan hingga lengan lurus, lalu ulangi.']},
  {n:'Straight-arm Pulldown', c:'G', l:1, e:'cc catt', p:'la tj', s:'tlo ps dp', st:[
   'Pasang straight bar atau rope di pulley tinggi, berdiri menghadap mesin.',
   'Condongkan badan sedikit ke depan, lengan lurus dengan siku sedikit menekuk.',
   'Tarik bar ke bawah dalam busur hingga menyentuh paha.',
   'Kembalikan perlahan ke atas setinggi kepala, lalu ulangi.']},
  {n:'Seated Cable Row', c:'G', l:1, e:'scr catt', p:'rh tm la', s:'tj dp BI brd es', st:[
   'Duduk dengan kaki di pijakan, lutut sedikit menekuk, pegang V-bar.',
   'Duduk tegak dengan dada terbuka dan punggung netral.',
   'Tarik handle ke perut sambil merapatkan tulang belikat.',
   'Kembalikan perlahan hingga lengan lurus tanpa membungkuk, lalu ulangi.']},
  {n:'Bent-over Barbell Row', c:'G', l:2, e:'bb pl', p:'la rh tm', s:'dp tj BI es bfl', st:[
   'Berdiri dengan kaki selebar pinggul, pegang barbell overhand sedikit lebih lebar dari bahu.',
   'Tekuk lutut sedikit dan bungkukkan badan dari pinggul hingga sekitar 45°, punggung lurus.',
   'Tarik bar ke perut bagian bawah sambil merapatkan tulang belikat.',
   'Turunkan bar perlahan hingga lengan lurus, lalu ulangi.']},
  {n:'One-arm Dumbbell Row', c:'G', l:1, e:'db fb', p:'la rh', s:'tm dp tj BI br', st:[
   'Letakkan satu lutut dan satu tangan di bench, punggung sejajar lantai.',
   'Pegang dumbbell dengan tangan lain, lengan lurus ke bawah.',
   'Tarik dumbbell ke arah pinggul dengan siku dekat badan.',
   'Turunkan perlahan, selesaikan semua repetisi lalu ganti sisi.']},
  {n:'T-Bar Row', c:'G', l:2, e:'tbar pl', p:'tm rh la', s:'dp tj BI es', st:[
   'Berdiri di pijakan T-bar (atau rebahkan dada di bantalan untuk versi chest-supported).',
   'Pegang handle, bungkukkan badan dari pinggul dengan punggung lurus.',
   'Tarik handle ke dada bawah sambil merapatkan tulang belikat.',
   'Turunkan perlahan hingga lengan lurus, lalu ulangi.']},
  {n:'Inverted Row', c:'BC', l:1, e:'rack smith? rings?', p:'rh tm la', s:'dp BI ra', st:[
   'Pasang bar setinggi pinggang (rack atau Smith machine), lalu berbaring di bawahnya.',
   'Pegang bar sedikit lebih lebar dari bahu, badan lurus dari kepala ke tumit.',
   'Tarik dada ke bar sambil merapatkan tulang belikat.',
   'Turunkan perlahan hingga lengan lurus, lalu ulangi.']},
  {n:'Face Pull', c:'G', l:1, e:'cc catt', p:'dp inf tn', s:'tm rh tlw', st:[
   'Pasang rope di pulley setinggi wajah, pegang kedua ujung dengan ibu jari menghadap ke belakang.',
   'Mundur hingga kabel tegang, berdiri tegak.',
   'Tarik rope ke arah wajah sambil membuka tangan ke samping telinga, siku tinggi.',
   'Tahan sebentar lalu kembalikan perlahan.']},
  {n:'Barbell Shrug', c:'G', l:1, e:'bb pl', p:'tu', s:'rh fds', st:[
   'Berdiri tegak memegang barbell di depan paha, genggaman selebar bahu.',
   'Jaga lengan lurus dan dada terbuka.',
   'Angkat bahu lurus ke atas setinggi mungkin ke arah telinga.',
   'Tahan sebentar, lalu turunkan perlahan.']},
  {n:'Barbell Deadlift', c:'G', l:2, e:'bb pl', p:'gx es HAM', s:'am Q tu la GRIP', st:[
   'Berdiri dengan kaki selebar pinggul, bar di atas pertengahan telapak kaki.',
   'Tekuk pinggul dan lutut, pegang bar tepat di luar kaki, punggung lurus dan dada terangkat.',
   'Tarik napas, kencangkan perut, lalu dorong lantai dengan kaki sambil menjaga bar dekat badan.',
   'Berdiri tegak penuh dengan pinggul terkunci, tanpa melengkungkan punggung ke belakang.',
   'Turunkan bar dengan mendorong pinggul ke belakang lebih dulu, lalu tekuk lutut.']},
  {n:'Trap Bar Deadlift', c:'G', l:1, e:'hex pl', p:'vl vm gx', s:'rf es HAM tu GRIP', st:[
   'Berdiri di tengah trap bar, kaki selebar pinggul.',
   'Jongkok dan pegang handle samping, punggung lurus, dada terangkat.',
   'Dorong lantai dan berdiri tegak sambil menjaga badan tegak.',
   'Turunkan kembali dengan terkontrol hingga plate menyentuh lantai.']},
  {n:'Back Extension', c:'G', l:1, e:'be', p:'es gx', s:'bfl st sm', st:[
   'Atur bantalan agar tepat di bawah tulang pinggul, kunci tumit di bawah penahan.',
   'Silangkan tangan di dada, badan lurus.',
   'Bungkukkan badan dari pinggul hingga hampir 90°.',
   'Angkat kembali hingga badan segaris dengan kaki, tanpa melengkung berlebihan.']},
  {n:'Superman', c:'B', l:1, e:'mat?', p:'es', s:'gx bfl tlw dp', st:[
   'Telungkup di matras dengan lengan lurus ke depan dan kaki lurus.',
   'Angkat lengan, dada, dan kaki bersamaan dari lantai.',
   'Tahan 2–3 detik sambil meremas bokong dan punggung bawah.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Muscle-up', c:'C', l:3, e:'pub rings?', p:'la ps TRI', s:'tj da BI ra tlw', st:[
   'Gantung di bar dengan genggaman sedikit di atas bar (false grip untuk ring).',
   'Lakukan ayunan kecil, lalu tarik bar dengan eksplosif ke arah pinggul.',
   'Saat dada mencapai bar, condongkan badan ke depan dan putar siku ke atas bar.',
   'Dorong ke atas seperti dip hingga lengan lurus di atas bar.',
   'Turunkan perlahan ke posisi gantung, lalu ulangi.']},
  {n:'Tuck Front Lever', c:'C', l:3, e:'pub', p:'la tj', s:'ra eo dp tlw rh tlo', st:[
   'Gantung di bar dengan genggaman overhand selebar bahu.',
   'Tekan bar ke bawah dengan lengan lurus sambil menarik lutut ke dada.',
   'Angkat pinggul hingga punggung sejajar lantai.',
   'Tahan 5–15 detik dengan lengan tetap lurus, lalu turunkan perlahan.']}
 ]],
 ['Bahu', [
  {n:'Barbell Overhead Press', c:'G', l:2, e:'bb pl rack', p:'da dl', s:'TRI pc tu sa', st:[
   'Ambil bar dari rack setinggi bahu, genggaman sedikit lebih lebar dari bahu.',
   'Berdiri dengan kaki selebar pinggul, kencangkan perut dan bokong.',
   'Dorong bar lurus ke atas sambil menarik kepala sedikit ke belakang agar bar lewat.',
   'Kunci lengan di atas kepala dengan bar di atas pertengahan kaki, lalu turunkan ke bahu.']},
  {n:'Seated Dumbbell Shoulder Press', c:'G', l:1, e:'db ab', p:'da dl', s:'TRI tu sa', st:[
   'Atur bench tegak, duduk dengan dumbbell di samping bahu, telapak menghadap depan.',
   'Punggung menempel sandaran, perut kencang.',
   'Dorong dumbbell ke atas hingga lengan hampir lurus.',
   'Turunkan perlahan hingga setinggi telinga, lalu ulangi.']},
  {n:'Arnold Press', c:'G', l:2, e:'db ab', p:'da dl', s:'pc TRI sa', st:[
   'Duduk tegak, pegang dumbbell di depan bahu dengan telapak menghadap badan.',
   'Dorong ke atas sambil memutar telapak tangan hingga menghadap depan.',
   'Kunci lengan di atas kepala.',
   'Turunkan sambil memutar kembali ke posisi awal.']},
  {n:'Machine Shoulder Press', c:'G', l:1, e:'spm', p:'da dl', s:'TRI', st:[
   'Atur kursi agar handle sejajar bahu, duduk dengan punggung menempel.',
   'Genggam handle dengan siku di bawah tangan.',
   'Dorong handle ke atas hingga lengan hampir lurus.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Dumbbell Lateral Raise', c:'G', l:1, e:'db', p:'dl', s:'tu da sa', st:[
   'Berdiri tegak dengan dumbbell di samping badan, siku sedikit menekuk.',
   'Angkat dumbbell ke samping hingga lengan sejajar bahu.',
   'Pimpin gerakan dengan siku, jangan mengangkat bahu ke telinga.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Dumbbell Front Raise', c:'G', l:1, e:'db', p:'da', s:'pc dl sa', st:[
   'Berdiri dengan dumbbell di depan paha, telapak menghadap badan.',
   'Angkat satu atau kedua dumbbell ke depan dengan lengan hampir lurus.',
   'Berhenti saat lengan sejajar bahu.',
   'Turunkan perlahan tanpa mengayun badan.']},
  {n:'Bent-over Reverse Fly', c:'G', l:1, e:'db pd?', p:'dp', s:'rh tm inf tn', st:[
   'Bungkukkan badan dari pinggul hingga hampir sejajar lantai, punggung lurus.',
   'Pegang dumbbell di bawah dada, telapak saling berhadapan, siku sedikit menekuk.',
   'Buka lengan ke samping hingga sejajar badan.',
   'Turunkan perlahan, lalu ulangi. (Bisa juga di pec deck posisi rear delt.)']},
  {n:'Upright Row', c:'G', l:2, e:'ez', p:'dl tu', s:'da BI brd', st:[
   'Berdiri memegang EZ bar di depan paha, genggaman selebar bahu.',
   'Tarik bar ke atas dekat badan dengan siku memimpin.',
   'Berhenti saat siku setinggi bahu.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Landmine Press', c:'G', l:1, e:'lm bb pl', p:'da pc', s:'TRI sa eo', st:[
   'Pasang satu ujung barbell di landmine, pegang ujung lain di depan bahu.',
   'Berdiri dengan kaki dibuka atau setengah berlutut, perut kencang.',
   'Dorong bar ke atas dan ke depan hingga lengan lurus.',
   'Turunkan kembali ke depan bahu, selesaikan repetisi lalu ganti sisi.']},
  {n:'Pike Push-up', c:'BC', l:2, e:'mat?', p:'da dl', s:'TRI tu sa pc', st:[
   'Mulai dari posisi push-up, lalu angkat pinggul tinggi membentuk huruf V terbalik.',
   'Tangan selebar bahu, kepala di antara lengan.',
   'Tekuk siku dan turunkan kepala ke lantai di depan tangan.',
   'Dorong kembali hingga lengan lurus.']},
  {n:'Wall Handstand Push-up', c:'C', l:3, e:'mat?', p:'da dl', s:'TRI tu sa', st:[
   'Lakukan handstand menghadap atau membelakangi dinding, tangan selebar bahu.',
   'Kencangkan perut dan bokong, badan lurus.',
   'Turunkan kepala perlahan hingga hampir menyentuh lantai.',
   'Dorong kembali hingga lengan lurus.']}
 ]],
 ['Lengan', [
  {n:'Barbell Curl', c:'G', l:1, e:'bb pl', p:'bl bs', s:'br brd fcr', st:[
   'Berdiri tegak memegang barbell underhand selebar bahu.',
   'Jaga siku tetap di samping badan.',
   'Angkat bar ke arah bahu dengan menekuk siku.',
   'Turunkan perlahan hingga lengan lurus, tanpa mengayun badan.']},
  {n:'Alternating Dumbbell Curl', c:'G', l:1, e:'db', p:'bl bs', s:'br brd', st:[
   'Berdiri dengan dumbbell di samping badan, telapak menghadap paha.',
   'Angkat satu dumbbell sambil memutar telapak hingga menghadap atas.',
   'Remas biceps di atas, lalu turunkan perlahan.',
   'Ulangi dengan tangan lain secara bergantian.']},
  {n:'Hammer Curl', c:'G', l:1, e:'db', p:'brd br', s:'bl ecr', st:[
   'Berdiri dengan dumbbell di samping badan, telapak saling berhadapan.',
   'Angkat dumbbell dengan posisi genggaman tetap netral.',
   'Jaga siku di samping badan.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Preacher Curl', c:'G', l:1, e:'ez prb', p:'bs br', s:'bl brd', st:[
   'Duduk di preacher bench dengan lengan atas menempel di bantalan.',
   'Pegang EZ bar underhand.',
   'Angkat bar hingga lengan bawah hampir tegak.',
   'Turunkan perlahan hingga lengan hampir lurus, lalu ulangi.']},
  {n:'Incline Dumbbell Curl', c:'G', l:2, e:'db ab', p:'bl', s:'bs br', st:[
   'Atur bench di sudut 45–60°, berbaring dengan lengan menggantung lurus.',
   'Pegang dumbbell dengan telapak menghadap depan.',
   'Angkat dumbbell tanpa memajukan siku.',
   'Turunkan perlahan hingga lengan lurus penuh.']},
  {n:'Reverse Curl', c:'G', l:1, e:'ez', p:'brd br', s:'ecr exd BI', st:[
   'Berdiri memegang EZ bar overhand (telapak menghadap bawah).',
   'Jaga siku di samping badan.',
   'Angkat bar ke arah bahu.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Triceps Pushdown', c:'G', l:1, e:'cc catt', p:'tla tme', s:'tlo', st:[
   'Pasang rope atau straight bar di pulley tinggi.',
   'Berdiri tegak, siku menempel di samping badan.',
   'Dorong handle ke bawah hingga lengan lurus.',
   'Kembalikan perlahan sampai lengan bawah sejajar lantai.']},
  {n:'Skull Crusher', c:'G', l:2, e:'ez fb', p:'tlo tla tme', s:'', st:[
   'Berbaring di flat bench, tahan EZ bar di atas dada dengan lengan lurus.',
   'Condongkan lengan atas sedikit ke arah kepala.',
   'Tekuk siku dan turunkan bar ke dahi atau di belakang kepala.',
   'Luruskan siku kembali tanpa menggerakkan lengan atas.']},
  {n:'Overhead Triceps Extension', c:'G', l:1, e:'db', p:'tlo', s:'tla tme', st:[
   'Berdiri atau duduk, pegang satu dumbbell dengan kedua tangan di atas kepala.',
   'Jaga siku menghadap depan dan dekat kepala.',
   'Turunkan dumbbell ke belakang kepala dengan menekuk siku.',
   'Luruskan kembali ke atas.']},
  {n:'Close-grip Bench Press', c:'G', l:2, e:'bb pl fb rack', p:'tla tme tlo', s:'ps pc da', st:[
   'Berbaring di bench, genggam bar selebar bahu.',
   'Angkat bar dari rack dan tahan di atas dada.',
   'Turunkan bar ke dada bawah dengan siku dekat badan.',
   'Dorong ke atas hingga lengan lurus.']},
  {n:'Bench Dip', c:'B', l:1, e:'fb', p:'tla tme tlo', s:'da ps', st:[
   'Duduk di tepi bench, letakkan tangan di samping pinggul.',
   'Geser pinggul ke depan dari bench, kaki lurus atau menekuk.',
   'Tekuk siku dan turunkan pinggul hingga siku sekitar 90°.',
   'Dorong kembali ke atas hingga lengan lurus.']},
  {n:'Wrist Curl', c:'G', l:1, e:'db fb', p:'fcr fcu fds plm', s:'', st:[
   'Duduk dan letakkan lengan bawah di paha atau bench, telapak menghadap atas.',
   'Biarkan pergelangan tangan menggantung di luar tepi.',
   'Tekuk pergelangan tangan ke atas sejauh mungkin.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Reverse Wrist Curl', c:'G', l:1, e:'db fb', p:'ecr ecu exd', s:'brd', st:[
   'Letakkan lengan bawah di paha atau bench, telapak menghadap bawah.',
   'Biarkan pergelangan tangan menggantung di luar tepi.',
   'Angkat punggung tangan ke atas.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Farmer\'s Carry', c:'G', l:1, e:'db kb?', p:'fds fcu fcr tu', s:'eo ra es gm', st:[
   'Ambil dumbbell atau kettlebell berat di kedua tangan.',
   'Berdiri tegak, bahu ke belakang, perut kencang.',
   'Berjalan dengan langkah pendek dan stabil sejauh jarak yang ditentukan.',
   'Letakkan beban dengan menekuk lutut dan pinggul.']}
 ]],
 ['Kaki & Bokong', [
  {n:'Barbell Back Squat', c:'G', l:2, e:'bb pl rack', p:'vl vm rf gx', s:'am es bfl st so ra', st:[
   'Letakkan bar di punggung atas (di atas trapezius), lepaskan dari rack dan mundur dua langkah.',
   'Kaki selebar bahu, ujung kaki sedikit menghadap keluar.',
   'Tarik napas, kencangkan perut, lalu turun dengan mendorong pinggul ke belakang dan menekuk lutut.',
   'Turun hingga paha minimal sejajar lantai, lutut searah ujung kaki.',
   'Dorong lantai dan berdiri kembali hingga pinggul dan lutut lurus.']},
  {n:'Front Squat', c:'G', l:3, e:'bb pl rack', p:'vl vm rf', s:'gx am es ra tu', st:[
   'Letakkan bar di depan bahu, siku tinggi ke depan (front rack).',
   'Lepaskan dari rack, kaki selebar bahu.',
   'Turun dengan badan tegak hingga paha di bawah sejajar.',
   'Dorong ke atas sambil menjaga siku tetap tinggi.']},
  {n:'Goblet Squat', c:'G', l:1, e:'kb db?', p:'vl vm rf gx', s:'am ra es da', st:[
   'Pegang kettlebell atau dumbbell di depan dada dengan kedua tangan.',
   'Kaki sedikit lebih lebar dari bahu.',
   'Turun dengan siku masuk di antara lutut, badan tetap tegak.',
   'Dorong kembali ke atas.']},
  {n:'Bodyweight Squat', c:'B', l:1, e:'', p:'vl vm rf gx', s:'am so es', st:[
   'Berdiri dengan kaki selebar bahu, tangan lurus ke depan.',
   'Dorong pinggul ke belakang dan tekuk lutut.',
   'Turun hingga paha sejajar lantai, tumit tetap menapak.',
   'Berdiri kembali sambil meremas bokong.']},
  {n:'Leg Press', c:'G', l:1, e:'lp', p:'vl vm rf gx', s:'am st so', st:[
   'Duduk dengan punggung menempel, kaki di platform selebar bahu.',
   'Lepaskan pengaman dan luruskan kaki tanpa mengunci lutut.',
   'Turunkan platform hingga lutut sekitar 90°, pinggul tidak terangkat.',
   'Dorong platform kembali ke atas.']},
  {n:'Hack Squat', c:'G', l:2, e:'hs', p:'vl vm rf', s:'gx am', st:[
   'Berdiri di platform dengan punggung dan bahu menempel bantalan.',
   'Kaki selebar bahu di tengah platform, lepaskan pengaman.',
   'Turun dengan menekuk lutut hingga paha sejajar platform.',
   'Dorong kembali ke atas.']},
  {n:'Bulgarian Split Squat', c:'G', l:2, e:'db? fb', p:'vl vm gx', s:'gm am rf so', st:[
   'Berdiri membelakangi bench, letakkan punggung kaki belakang di atas bench.',
   'Kaki depan maju cukup jauh, pegang dumbbell jika perlu.',
   'Turunkan badan hingga paha depan sejajar lantai.',
   'Dorong dengan kaki depan untuk berdiri kembali. Selesaikan lalu ganti sisi.']},
  {n:'Walking Lunge', c:'GB', l:1, e:'db?', p:'vl vm rf gx', s:'gm am bfl GAS', st:[
   'Berdiri tegak, pegang dumbbell di samping jika ingin tambahan beban.',
   'Melangkah lebar ke depan dan turunkan lutut belakang hampir ke lantai.',
   'Kedua lutut membentuk sudut sekitar 90°.',
   'Dorong dengan kaki depan dan langsung melangkah dengan kaki lain.']},
  {n:'Step-up', c:'GB', l:1, e:'box db?', p:'vl vm gx', s:'gm rf GAS', st:[
   'Berdiri di depan box atau bench, letakkan satu kaki di atasnya.',
   'Dorong dengan kaki di atas box hingga berdiri penuh.',
   'Turun perlahan dengan kaki yang sama mengontrol gerakan.',
   'Selesaikan repetisi lalu ganti kaki.']},
  {n:'Romanian Deadlift', c:'G', l:2, e:'bb pl', p:'bfl st sm gx', s:'es am GRIP', st:[
   'Berdiri tegak memegang barbell di depan paha.',
   'Tekuk lutut sedikit dan kunci di sudut itu.',
   'Dorong pinggul ke belakang, turunkan bar dekat kaki hingga hamstring terasa meregang.',
   'Kembali tegak dengan mendorong pinggul ke depan.']},
  {n:'Sumo Deadlift', c:'G', l:2, e:'bb pl', p:'gx am vl vm', s:'es HAM al tu GRIP', st:[
   'Berdiri dengan kaki sangat lebar, ujung kaki menghadap keluar, bar di atas pertengahan kaki.',
   'Pegang bar di antara kaki dengan lengan lurus.',
   'Dada terangkat, dorong lutut keluar, lalu dorong lantai untuk berdiri.',
   'Kunci pinggul di atas, lalu turunkan dengan terkontrol.']},
  {n:'Leg Extension', c:'G', l:1, e:'le', p:'rf vl vm', s:'', st:[
   'Duduk dengan lutut sejajar sumbu mesin, bantalan di atas pergelangan kaki.',
   'Pegang handle di samping kursi.',
   'Luruskan kaki hingga lutut hampir terkunci.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Leg Curl', c:'G', l:1, e:'lc', p:'bfl bfs st sm', s:'GAS gr sar', st:[
   'Berbaring tengkurap (atau duduk) dengan bantalan di atas tumit.',
   'Pastikan lutut sejajar sumbu mesin.',
   'Tekuk lutut dan tarik tumit ke arah bokong.',
   'Kembalikan perlahan hingga kaki hampir lurus.']},
  {n:'Nordic Hamstring Curl', c:'BC', l:3, e:'mat ghd?', p:'bfl bfs st sm', s:'GAS gx', st:[
   'Berlutut di matras dengan tumit dikunci (oleh partner atau penahan).',
   'Badan lurus dari lutut ke kepala, tangan di depan dada.',
   'Condongkan badan ke depan sepelan mungkin dengan menahan lewat hamstring.',
   'Tangkap badan dengan tangan saat tidak kuat lagi, lalu dorong kembali ke atas.']},
  {n:'Barbell Hip Thrust', c:'G', l:2, e:'bb pl fb', p:'gx', s:'bfl st gm am', st:[
   'Duduk dengan punggung atas bersandar di tepi bench, barbell di atas pinggul.',
   'Kaki menapak selebar pinggul, lutut menekuk.',
   'Dorong pinggul ke atas hingga badan lurus dari bahu ke lutut.',
   'Remas bokong di atas, lalu turunkan perlahan.']},
  {n:'Glute Bridge', c:'B', l:1, e:'mat?', p:'gx', s:'HAM es gm', st:[
   'Berbaring telentang, lutut menekuk, telapak kaki di lantai.',
   'Tangan di samping badan.',
   'Angkat pinggul hingga badan lurus dari bahu ke lutut.',
   'Tahan sebentar, lalu turunkan perlahan.']},
  {n:'Hip Abduction Machine', c:'G', l:1, e:'hab', p:'gm tfl', s:'gx', st:[
   'Duduk dengan bantalan di sisi luar lutut.',
   'Punggung bersandar, pegang handle.',
   'Buka kaki ke luar sejauh mungkin.',
   'Kembalikan perlahan, lalu ulangi.']},
  {n:'Hip Adduction Machine', c:'G', l:1, e:'hab', p:'al am pec gr', s:'', st:[
   'Duduk dengan bantalan di sisi dalam lutut, kaki terbuka.',
   'Punggung bersandar, pegang handle.',
   'Rapatkan kaki ke tengah.',
   'Buka kembali perlahan, lalu ulangi.']},
  {n:'Copenhagen Plank', c:'B', l:3, e:'fb', p:'al am gr', s:'eo gm ra', st:[
   'Posisi side plank di samping bench, letakkan kaki atas di atas bench.',
   'Tumpu dengan siku di lantai.',
   'Angkat pinggul hingga badan lurus, kaki bawah menggantung.',
   'Tahan 10–30 detik, lalu ganti sisi.']},
  {n:'Pistol Squat', c:'C', l:3, e:'', p:'vl vm rf gx', s:'gm am so ra ta', st:[
   'Berdiri dengan satu kaki, kaki lain lurus ke depan.',
   'Tangan lurus ke depan untuk keseimbangan.',
   'Turun perlahan dengan satu kaki hingga bokong mendekati tumit.',
   'Dorong kembali ke atas tanpa kaki depan menyentuh lantai.']},
  {n:'Box Jump', c:'GB', l:2, e:'box', p:'vl vm gx GAS', s:'so HAM ra', st:[
   'Berdiri di depan box, kaki selebar pinggul.',
   'Tekuk lutut dan ayunkan lengan ke belakang.',
   'Lompat eksplosif dan mendarat lembut di atas box dengan lutut menekuk.',
   'Berdiri tegak, lalu turun dengan melangkah.']},
  {n:'Standing Calf Raise', c:'G', l:1, e:'crm', p:'gmh glh', s:'so fl', st:[
   'Berdiri di mesin dengan bantalan di bahu, ujung kaki di tepi pijakan.',
   'Turunkan tumit di bawah pijakan hingga betis meregang.',
   'Angkat tumit setinggi mungkin.',
   'Tahan sebentar, lalu turunkan perlahan.']},
  {n:'Seated Calf Raise', c:'G', l:1, e:'crm', p:'so', s:'gmh glh fl', st:[
   'Duduk dengan bantalan di atas paha dekat lutut, ujung kaki di pijakan.',
   'Lepaskan pengaman.',
   'Angkat tumit setinggi mungkin.',
   'Turunkan perlahan hingga betis meregang.']},
  {n:'Tibialis Raise', c:'B', l:1, e:'', p:'ta', s:'edl', st:[
   'Bersandar di dinding dengan tumit sekitar satu langkah di depan.',
   'Kaki lurus, berat badan di tumit.',
   'Angkat ujung kaki ke arah tulang kering setinggi mungkin.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Kettlebell Swing', c:'G', l:2, e:'kb', p:'gx HAM', s:'es ra da GRIP am', st:[
   'Berdiri dengan kaki sedikit lebih lebar dari bahu, kettlebell di depan.',
   'Bungkuk dari pinggul, pegang kettlebell dan ayunkan ke antara kaki.',
   'Dorong pinggul ke depan dengan kuat hingga kettlebell terayun setinggi dada.',
   'Biarkan kettlebell jatuh kembali ke antara kaki dan langsung ulangi.']}
 ]],
 ['Core', [
  {n:'Plank', c:'B', l:1, e:'mat?', p:'ra', s:'eo sa gx da rf', st:[
   'Tumpu dengan lengan bawah di lantai, siku di bawah bahu.',
   'Luruskan kaki, badan lurus dari kepala ke tumit.',
   'Kencangkan perut dan bokong.',
   'Tahan selama waktu yang ditentukan tanpa pinggul turun.']},
  {n:'Side Plank', c:'B', l:1, e:'mat?', p:'eo', s:'gm ra es tfl', st:[
   'Berbaring miring, tumpu dengan satu siku di bawah bahu.',
   'Tumpuk kedua kaki.',
   'Angkat pinggul hingga badan lurus.',
   'Tahan, lalu ganti sisi.']},
  {n:'Crunch', c:'B', l:1, e:'mat?', p:'ra', s:'eo', st:[
   'Berbaring telentang, lutut menekuk, tangan di samping kepala.',
   'Angkat bahu dari lantai dengan menggulung tulang belakang.',
   'Tahan sebentar di atas.',
   'Turunkan perlahan, lalu ulangi.']},
  {n:'Bicycle Crunch', c:'B', l:1, e:'mat?', p:'ra eo', s:'rf', st:[
   'Berbaring telentang, tangan di samping kepala, angkat kaki.',
   'Tarik satu lutut ke dada sambil memutar siku berlawanan ke arahnya.',
   'Luruskan kaki itu sambil menarik lutut lain.',
   'Ulangi bergantian seperti mengayuh sepeda.']},
  {n:'Hanging Leg Raise', c:'C', l:2, e:'pub', p:'ra', s:'rf sar tfl eo GRIP', st:[
   'Gantung di bar dengan lengan lurus.',
   'Kencangkan perut dan hentikan ayunan.',
   'Angkat kaki lurus hingga sejajar lantai atau lebih tinggi.',
   'Turunkan perlahan tanpa berayun.']},
  {n:'Lying Leg Raise', c:'B', l:1, e:'mat?', p:'ra', s:'rf sar eo', st:[
   'Berbaring telentang, tangan di samping atau di bawah pinggul.',
   'Angkat kaki lurus hingga tegak lurus lantai.',
   'Turunkan perlahan tanpa punggung bawah terangkat.',
   'Berhenti sebelum kaki menyentuh lantai, lalu ulangi.']},
  {n:'Russian Twist', c:'B', l:1, e:'mb? mat?', p:'eo', s:'ra rf', st:[
   'Duduk dengan lutut menekuk, condongkan badan ke belakang sekitar 45°.',
   'Pegang medicine ball atau satukan tangan di depan dada.',
   'Putar badan ke kanan, lalu ke kiri.',
   'Angkat kaki dari lantai untuk menambah tingkat kesulitan.']},
  {n:'Ab Wheel Rollout', c:'G', l:2, e:'awh mat?', p:'ra', s:'eo la sa tlo da', st:[
   'Berlutut di matras dan pegang ab wheel di depan lutut.',
   'Gulirkan roda ke depan perlahan sambil menjaga punggung lurus.',
   'Berhenti saat badan hampir sejajar lantai.',
   'Tarik kembali dengan perut ke posisi awal.']},
  {n:'Cable Crunch', c:'G', l:1, e:'cc catt', p:'ra', s:'eo', st:[
   'Pasang rope di pulley tinggi, berlutut menghadap mesin.',
   'Pegang rope di samping kepala.',
   'Bungkukkan badan ke bawah dengan menggulung tulang belakang.',
   'Kembali perlahan, lalu ulangi.']},
  {n:'Cable Woodchopper', c:'G', l:2, e:'cc catt', p:'eo', s:'ra sa da gm', st:[
   'Pasang D-handle di pulley tinggi, berdiri menyamping dari mesin.',
   'Pegang handle dengan kedua tangan.',
   'Tarik handle secara diagonal ke bawah melintasi badan sambil memutar torso.',
   'Kembali perlahan, selesaikan lalu ganti sisi.']},
  {n:'Pallof Press', c:'G', l:1, e:'cc catt band?', p:'eo', s:'ra sa gm', st:[
   'Pasang handle di pulley setinggi dada, berdiri menyamping dari mesin.',
   'Pegang handle di depan dada dengan kedua tangan.',
   'Dorong handle lurus ke depan tanpa membiarkan badan berputar.',
   'Tahan 2 detik, lalu tarik kembali ke dada.']},
  {n:'Mountain Climber', c:'B', l:1, e:'', p:'ra rf', s:'da eo sa gx', st:[
   'Posisi push-up dengan lengan lurus.',
   'Tarik satu lutut ke arah dada.',
   'Kembalikan kaki dan langsung tarik lutut lain.',
   'Lakukan bergantian dengan cepat sambil menjaga pinggul rendah.']},
  {n:'Dead Bug', c:'B', l:1, e:'mat?', p:'ra', s:'eo rf', st:[
   'Berbaring telentang dengan lengan lurus ke atas, lutut 90° di udara.',
   'Tekan punggung bawah ke lantai.',
   'Luruskan satu kaki dan lengan berlawanan menjauh dari badan.',
   'Kembalikan, lalu ulangi dengan sisi lain.']},
  {n:'Hollow Body Hold', c:'C', l:2, e:'mat?', p:'ra', s:'eo rf sa', st:[
   'Berbaring telentang, lengan lurus di atas kepala.',
   'Tekan punggung bawah ke lantai.',
   'Angkat bahu dan kaki beberapa sentimeter dari lantai.',
   'Tahan posisi seperti perahu selama waktu yang ditentukan.']},
  {n:'L-sit', c:'C', l:3, e:'par dip?', p:'ra rf', s:'tlo la tlw eo sar', st:[
   'Letakkan tangan di parallettes atau parallel bar.',
   'Tekan ke bawah hingga lengan lurus dan bahu turun.',
   'Angkat kaki lurus ke depan hingga sejajar lantai.',
   'Tahan selama mungkin sambil menjaga kaki lurus.']},
  {n:'Dragon Flag', c:'C', l:3, e:'fb', p:'ra', s:'eo la gx', st:[
   'Berbaring di bench, pegang tepi bench di belakang kepala.',
   'Angkat badan hingga hanya bahu yang menyentuh bench.',
   'Turunkan badan lurus perlahan seperti papan.',
   'Berhenti sebelum menyentuh bench, lalu angkat kembali.']}
 ]],
 ['Full body & Kardio', [
  {n:'Burpee', c:'B', l:2, e:'', p:'vl vm gx ps', s:'da TRI ra GAS', st:[
   'Berdiri tegak, lalu jongkok dan letakkan tangan di lantai.',
   'Lompatkan kaki ke belakang ke posisi push-up dan lakukan satu push-up.',
   'Lompatkan kaki kembali ke dekat tangan.',
   'Lompat ke atas dengan tangan di atas kepala, lalu ulangi.']},
  {n:'Power Clean', c:'G', l:3, e:'bb bump', p:'gx HAM Q tu', s:'es GAS so da GRIP', st:[
   'Berdiri dengan bar di atas pertengahan kaki, pegang sedikit lebih lebar dari bahu.',
   'Angkat bar dari lantai seperti deadlift hingga di atas lutut.',
   'Lompat eksplosif dengan meluruskan pinggul, lutut, dan pergelangan kaki, lalu angkat bahu.',
   'Tarik badan ke bawah bar dan tangkap di depan bahu dengan siku tinggi.',
   'Berdiri tegak, lalu turunkan bar dengan terkontrol.']},
  {n:'Thruster', c:'G', l:2, e:'bb pl db?', p:'vl vm gx da', s:'TRI dl ra tu', st:[
   'Pegang barbell di depan bahu (front rack), kaki selebar bahu.',
   'Lakukan front squat hingga paha sejajar lantai.',
   'Dorong ke atas dengan eksplosif dan lanjutkan dengan mendorong bar ke atas kepala.',
   'Turunkan bar ke bahu sambil langsung masuk ke squat berikutnya.']},
  {n:'Turkish Get-up', c:'G', l:3, e:'kb', p:'da eo gx', s:'TRI ra sa dl vl vm', st:[
   'Berbaring telentang, pegang kettlebell dengan lengan lurus ke atas.',
   'Tekuk lutut di sisi yang sama, lalu bangun ke siku dan ke tangan.',
   'Angkat pinggul, tarik kaki lurus ke bawah badan hingga berlutut.',
   'Berdiri penuh sambil mata tetap ke kettlebell.',
   'Balik urutan langkah untuk kembali berbaring.']},
  {n:'Jump Rope', c:'B', l:1, e:'jr', p:'gmh glh so', s:'ta Q da GRIP', st:[
   'Pegang handle tali di samping pinggul.',
   'Putar tali dengan pergelangan tangan, bukan bahu.',
   'Lompat rendah dengan ujung kaki saat tali lewat di bawah.',
   'Jaga ritme stabil selama waktu yang ditentukan.']},
  {n:'Battle Rope Waves', c:'G', l:1, e:'ropes', p:'da dl', s:'GRIP ra Q la', st:[
   'Pegang ujung tali, berdiri dengan lutut sedikit menekuk (quarter squat).',
   'Perut kencang, dada terbuka.',
   'Gerakkan lengan naik-turun bergantian dengan cepat untuk membuat gelombang.',
   'Lakukan selama interval yang ditentukan.']}
 ]]
];
export { GROUPS, MUSCLES, MACRO, EQUIP, SECTIONS };
