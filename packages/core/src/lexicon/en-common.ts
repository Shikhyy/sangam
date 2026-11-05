// Common English words, lowercase. This is a recognition list, not a dictionary:
// unknown Latin words default to English anyway (see tagger.ts), but words found here
// are tagged with confidence, and the tagger also tries simple suffix stripping
// (meetings, calling, called). Words that are also valid Hindi live in ambiguous.ts.
const WORDS = `
a an and or but if then than that this these those there here where when why how what who whom
whose which while because since until before after above below between into onto over under
again further once only own same too very just also even still yet already always never often
sometimes usually maybe perhaps not no nor yes all any both each few more most other some such
many much every either neither of off on out up down in at by for from with without about
against during through
i you we they she it my your his her its our their mine yours ours theirs him them myself
yourself himself herself itself ourselves themselves am was were been being be have has had
having will would shall should can could might must does did doing done get got getting go goes
went gone going come came coming make made making take took taken taking see saw seen know knew
known think thought want wanted need needed like liked love loved tell told ask asked give gave
given find found use used work worked try tried help helped start started stop stopped wait
waited check checked send sent pay paid book booked change changed cancel cancelled confirm
confirmed update updated open opened close closed call called watch read write wrote play eat
sleep sit stand run walk talk speak spoke say said let put keep kept bring brought buy bought
sell sold meet met learn learned feel felt look looked turn turned move moved live lived leave
left show showed hear heard
time day days week weeks month months year years today tomorrow yesterday morning afternoon
evening night hour hours minute minutes second seconds people person man woman men women child
children boy girl friend friends family mother father brother sister home house room office
school college class student teacher company business shop store market bank account balance
loan card payment amount money cash price cost rate bill invoice due date number phone mobile
message email text voice video photo picture file document form page app website online
internet network data system service customer client order delivery package product item list
name address city town country world place thing things way problem issue question answer reason
idea plan point part kind case result report test exam job meeting appointment ticket booking
trip travel flight train bus car bike road street food water tea coffee lunch dinner breakfast
game music movie news story book paper pen bag
good bad great nice fine best better worse worst new old young big small large little long
short high low early late fast slow hard easy free full empty ready sure true false right
wrong different important possible impossible happy sad angry tired busy hungry sick healthy
cheap expensive clean dirty hot cold warm cool simple special normal
please thanks thank sorry welcome sir madam mr mrs miss dear
one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen twenty
thirty forty fifty hundred thousand million billion first third last next
`;

export const EN_COMMON: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));
