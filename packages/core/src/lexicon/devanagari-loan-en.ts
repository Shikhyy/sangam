// English words that speech recognition writes in Devanagari. Tagged English even though
// the script is Devanagari. Extend this as the evaluation shows misses.
const WORDS = `
मीटिंग पेमेंट फोन मोबाइल ऑफिस टाइम प्लीज सॉरी थैंक्यू लोन बैंक कार्ड ऑनलाइन कस्टमर ऑर्डर डिलीवरी
अकाउंट बैलेंस रिचार्ज नंबर मैसेज कॉल वीडियो फोटो ट्रेन बस कार बाइक टिकट बुकिंग प्लान प्रॉब्लम
इश्यू क्वेश्चन आंसर रिपोर्ट एग्जाम क्लास कॉलेज स्कूल स्टूडेंट टीचर कंपनी बिजनेस सर्विस एप ऐप
वेबसाइट इंटरनेट नेटवर्क डेटा सिस्टम पासवर्ड ओटीपी ईमेल बिल इनवॉइस
`;

export const DEVANAGARI_LOAN_EN: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));
