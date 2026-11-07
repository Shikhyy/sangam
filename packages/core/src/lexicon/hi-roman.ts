// Romanised Hindi (Hinglish) words, lowercase. Words that are also valid English
// ("to", "me", "is", "the", "main", ...) live in ambiguous.ts, not here.
// This list is hand-curated and incomplete on purpose; the evaluation (docs/EVAL.md)
// reports where it fails. Add spelling variants freely.
const WORDS = `
mai mein mujhe mujhko mera meri mere tum tumhe tumhara tumhari tumhare tu tujhe tera teri tere
aap aapko aapka aapki aapke aapne apna apni apne woh wo vo usko uska uski uske unka unki unke
unko unhe unhone usne isne isko iska iski iske inka inki inke inko inhe hamara hamari hamare
hamko hume humein hamein hamne humne yeh ye yah ise kaun kya kyaa kyon kyun kab kahan kaha
kidhar kaise kaisa kaisi kitna kitni kitne kaunsa kaunsi konsa konsi
ka ki ke ko se ne par pe tak andar bahar upar neeche saath sath bina liye waste
aur lekin magar kyunki kyonki isliye isiliye agar toh warna phir fir bhi jabki jaise jaisa jaisi
taaki jo jab
hai hain hoon hu ho hona hota hoti hote hua hui hue tha thi thhe raha rahi rahe rahega rahegi
rahenge gaya gayi gaye gayee jana jaana jaata jaati jaate jaaunga jaungi jayega jayegi jaenge
jao jaiye chalo chalna chalega chalenge chal chalta chalti aana aata aati aate aaya aayi aaye
aao aaiye aaunga aayega aaenge karna karta karti karte kiya kiye kar kare karo kijiye karunga
karungi karega karegi karenge karein dena deta deti dete diya diye di dijiye dunga dungi dega
degi denge de lena leta leti lete liya lo lijiye lunga lungi lega legi lenge le dekhna dekho
dekha dekhi dekhte dekhiye dekhenge bolna bolo bola boli bolte bolunga bataya batao batana bata
batayiye bataiye batate suna suno sunna sunte sunai samajh samjha samjhi samjhe samajhna samjho
pata chahiye chahta chahti chahte chahna milna mila mili milega milegi milenge milo lagna laga
lagi lage lagta lagti lagte rakhna rakho rakha rakhi rakhe rakhiye bhejna bhejo bheja bhej
bhejiye khana khao khaya khaye peena pio piya soya soyi uthna utho utha baithna baitho baitha
ruko ruk rukna rukiye rukega bhulna bhool bhoolna bhoolo bhula yaad sochna socho socha soch
maanna maano maana maan padhna padho padha likhna likho likha likhi khelna khelo kholna kholo
khola hojayega hojaye hogaya hogayi hoga hogi honge hon
accha achha acha achi achhi achhe theek thik sahi galat bahut bohot bahot zyada jyada kam thoda
thodi thode bilkul ekdum turant jaldi dheere abhi kabhi hamesha roz rozana pehle pahle baad ab
aaj kal parso subah dopahar shaam raat din hafta mahina saal ghanta ghante samay waqt tareekh
baat baatein kaam paisa paise rupaye rupay rupaya ghar log aadmi aurat ladka ladki bacha
bachche beta beti bhai behen behan bhaiya didi dost yaar yaaar mitra dada dadi nana nani mama
mausi chacha chachi papa mummy maa baap pati patni paani chai doodh roti sabzi daal dal chawal
nashta khaana gaadi gadi dukaan dukan bazaar bazar sadak raasta shehar gaon desh duniya jagah
kamra darwaza khidki kitaab kapde sapna sawaal jawab jawaab mushkil aasaan dikkat pareshani
tabiyat bimari dawai dard bukhar haath pair aankh dil dimag
arey arre oye haan han nahi nahin nai na naa nhi ji bas matlab yaani yani suniye waise vaise
sach jhooth sachchi pakka pakki shayad zaroor zarur jarur
ek teen char chaar paanch panch chhe chhah saat aath nau das gyarah barah terah chaudah pandrah
solah satrah atharah unnis bees tees chalis pachas sau hazaar hazar lakh crore karod dedh dhai
aadha adha paune sawa sadhe pehla doosra dusra teesra
namaste namaskar shukriya dhanyavaad dhanyawad maaf maafi alvida
kuch kuchh koi kaafi kaafi sabhi sab saara sara poora pura har dono dusre doosre apas aapas
khud sirf keval lagbhag takriban
sakta sakti sakte sake saka sakenge sakunga sakungi sakoge sakogi
aa mil milta milti milte milunga milungi milenge lag lagega lagegi lagenge
jaunga jaungi jaoge jaogi jayenge bataunga bataungi batayega bataoge batayenge
khati khaunga khaungi khayenge nikal nikalna nikalte nikalo nikla nikli nikalta
pahunch pahunchna pahunchte pahunchunga pahunchi pahunche bula bulao bulana bulaya bulaiye
wala wali wale baar kaat kaatna kaate kaati karni karne
maine tumne sochkar karke dekhkar bolkar batakar sunkar lekar jakar aakar
pasand baje baja bhookh bhook pyaas yahan wahan vahan yahaan wahaan
gir girna gira girti girte rehna rehta rehti rehte rahunga rahungi
puchna pucho poocha puchh samajhta samajhti sunta sunti jaanta jaanti jaanna janna
shuru khatam dobara dubara firse wapas kabhi kuchh
chahun chahunga chahenge bolega bolegi bologe bolenge
`;

export const HI_ROMAN: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));
