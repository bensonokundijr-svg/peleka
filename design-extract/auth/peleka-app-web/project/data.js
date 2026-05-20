// Sample data — Nairobi, Kenya. Used by both dashboard variants.

const NOW = Date.now();
const m = (mins) => NOW - mins * 60_000;

window.PELEKA_DATA = {
  business: {
    name: "Fragrance HQ Kenya",
    plan: "Trial",
    trialUsed: 14,
    trialTotal: 25,
    ownerName: "Benson Okundi",
    ownerEmail: "benson@fragrancehq.co.ke",
    ownerInitial: "F",
    phone: "+254 796 877 559",
    address: "Nyari Estate, Red Hill Drive",
    addressLine2: "Nairobi",
  },

  riders: [
    { id: "r1", name: "Brian Kamau", phone: "+254 712 000 001", completed: 47, rating: 4.8 },
    { id: "r2", name: "Dan Mwangi",  phone: "+254 722 000 002", completed: 23, rating: 4.2 },
    { id: "r3", name: "Joe Otieno",  phone: "+254 733 000 003", completed: 12, rating: 3.9 },
  ],

  deliveries: [
    // ── Active / dispatched — Dan is out with a 3-stop route
    { id: "d-9821", customerName: "Aisha Wanjiru",  customerPhone: "+254 712 445 992", address: "Westgate Mall, Westlands",       notes: "Call at gate — 0722 111 222",                status: "dispatched", riderId: "r2", createdAt: m(38), dispatchedAt: m(22), eta: 8,  queuePos: 1, queueSize: 3, lat: -1.2569, lng: 36.8033 },
    { id: "d-9820", customerName: "Mercy Achieng",  customerPhone: "+254 720 118 774", address: "Galleria, Karen",                notes: "House 261, Red Hill Drive",                  status: "dispatched", riderId: "r2", createdAt: m(36), dispatchedAt: m(22), eta: 19, queuePos: 2, queueSize: 3, lat: -1.3417, lng: 36.7196 },
    { id: "d-9817", customerName: "Daniel Mutiso",  customerPhone: "+254 711 802 336", address: "Yaya Centre, Kilimani",          notes: "Payment on delivery — collect KES 2,500",     status: "dispatched", riderId: "r2", createdAt: m(54), dispatchedAt: m(22), eta: 28, queuePos: 3, queueSize: 3, lat: -1.2899, lng: 36.7869 },

    // ── Assigned, awaiting dispatch
    { id: "d-9824", customerName: "Lillian Auma",   customerPhone: "+254 715 668 022", address: "Junction Mall, Ngong Road",      notes: "Leave with security guard",                  status: "assigned",   riderId: "r3", createdAt: m(12), lat: -1.2974, lng: 36.7748 },
    { id: "d-9823", customerName: "Peter Kiprono",  customerPhone: "+254 734 559 700", address: "Sarit Centre, Westlands",        notes: "Fragile contents, handle carefully",         status: "assigned",   riderId: "r1", createdAt: m(16), lat: -1.2614, lng: 36.8019 },

    // ── Unassigned
    { id: "d-9826", customerName: "Naomi Cherono",  customerPhone: "+254 700 882 419", address: "Two Rivers Mall, Runda",         notes: "Fragile contents, handle carefully",         status: "unassigned", createdAt: m(4),  lat: -1.2128, lng: 36.8235 },
    { id: "d-9825", customerName: "Tobias Macharia",customerPhone: "+254 798 224 091", address: "Lavington Mall, Lavington",      notes: "",                                            status: "unassigned", createdAt: m(8),  lat: -1.2792, lng: 36.7635 },
    { id: "d-9822", customerName: "Grace Wairimu",  customerPhone: "+254 728 011 358", address: "Village Market, Gigiri",         notes: "Leave with security guard",                  status: "unassigned", createdAt: m(11), lat: -1.2336, lng: 36.8045 },
    { id: "d-9819", customerName: "Eric Otieno",    customerPhone: "+254 705 334 612", address: "Garden City Mall, Thika Road",   notes: "Payment on delivery — collect KES 1,800",     status: "unassigned", createdAt: m(19), lat: -1.2274, lng: 36.8772 },

    // ── Delivered today
    { id: "d-9815", customerName: "Hannah Njeri",   customerPhone: "+254 717 442 851", address: "Capital Centre, South B",        notes: "",                                            status: "delivered",  riderId: "r1", createdAt: m(180), deliveredAt: m(95),  feedback: "positive", lat: -1.3072, lng: 36.8369 },
    { id: "d-9814", customerName: "Collins Barasa", customerPhone: "+254 729 600 178", address: "TRM, Roysambu",                  notes: "",                                            status: "delivered",  riderId: "r2", createdAt: m(220), deliveredAt: m(140), feedback: null, lat: -1.2167, lng: 36.8830 },
    { id: "d-9813", customerName: "Ruth Wambui",    customerPhone: "+254 711 220 449", address: "Prestige Plaza, Ngong Road",     notes: "",                                            status: "delivered",  riderId: "r1", createdAt: m(265), deliveredAt: m(180), feedback: "positive", lat: -1.2954, lng: 36.7878 },
    { id: "d-9812", customerName: "James Korir",    customerPhone: "+254 798 813 200", address: "Westlands Square",               notes: "",                                            status: "delivered",  riderId: "r1", createdAt: m(310), deliveredAt: m(230), feedback: "neutral", lat: -1.2658, lng: 36.8095 },
    { id: "d-9810", customerName: "Beatrice Akinyi",customerPhone: "+254 720 559 884", address: "ABC Place, Waiyaki Way",         notes: "",                                            status: "delivered",  riderId: "r3", createdAt: m(360), deliveredAt: m(285), feedback: "positive", lat: -1.2614, lng: 36.7752 },

    // ── Failed
    { id: "d-9816", customerName: "Patrick Njuguna",customerPhone: "+254 712 088 503", address: "Greenspan Mall, Donholm",        notes: "",                                            status: "failed",    riderId: "r3", createdAt: m(140), deliveredAt: m(82),  failureReason: "Customer unreachable", lat: -1.2972, lng: 36.8853 },
    { id: "d-9809", customerName: "Wendy Mumbi",    customerPhone: "+254 715 442 991", address: "Crossroads, Karen",              notes: "",                                            status: "failed",    riderId: "r1", createdAt: m(400), deliveredAt: m(320), failureReason: "Wrong address", lat: -1.3293, lng: 36.7110 },
  ],

  // mock metrics by period
  trend: [4, 6, 5, 8, 12, 9, 14, 11, 13, 15, 18, 16, 17, 19],

  // Historical archive — for the Orders page. Spans last ~30 days.
  history: (function () {
    const day = 86_400_000;
    const now = Date.now();
    return [
      // ── Today
      { id: "d-9815", customerName: "Hannah Njeri",   customerPhone: "+254 717 442 851", address: "Capital Centre, South B",      riderId: "r1", riderName: "Brian Kamau", status: "delivered", dispatchedAt: now - 95*60_000 - 24*60_000, deliveredAt: now - 95*60_000, durationMin: 24, orderRating: 5, deliveryRating: 5, feedbackComment: "Brian arrived right on time. Bouquet was perfect!", notes: "Leave with reception" },
      { id: "d-9814", customerName: "Collins Barasa", customerPhone: "+254 729 600 178", address: "TRM, Roysambu",                riderId: "r2", riderName: "Dan Mwangi",  status: "delivered", dispatchedAt: now - 140*60_000 - 31*60_000, deliveredAt: now - 140*60_000, durationMin: 31, notes: "" },
      { id: "d-9813", customerName: "Ruth Wambui",    customerPhone: "+254 711 220 449", address: "Prestige Plaza, Ngong Road",   riderId: "r1", riderName: "Brian Kamau", status: "delivered", dispatchedAt: now - 180*60_000 - 22*60_000, deliveredAt: now - 180*60_000, durationMin: 22, orderRating: 4, deliveryRating: 5, notes: "" },
      // ── Yesterday
      { id: "d-9802", customerName: "James Korir",    customerPhone: "+254 798 813 200", address: "Westlands Square",             riderId: "r3", riderName: "Joe Otieno",  status: "delivered", dispatchedAt: now - day - 60*60_000, deliveredAt: now - day - 60*60_000 + 28*60_000, durationMin: 28, notes: "" },
      { id: "d-9801", customerName: "Patrick Njuguna",customerPhone: "+254 712 088 503", address: "Greenspan Mall, Donholm",      riderId: "r2", riderName: "Dan Mwangi",  status: "failed",    dispatchedAt: now - day - 4*60*60_000, deliveredAt: now - day - 4*60*60_000 + 47*60_000, durationMin: 47, failureReason: "Customer unreachable", notes: "Call before arrival" },
      // ── 2 days ago
      { id: "d-9794", customerName: "Mercy Wanjiku",  customerPhone: "+254 715 902 008", address: "Yaya Centre, Kilimani",        riderId: "r1", riderName: "Brian Kamau", status: "delivered", dispatchedAt: now - 2*day - 2*60*60_000, deliveredAt: now - 2*day - 2*60*60_000 + 19*60_000, durationMin: 19, orderRating: 5, deliveryRating: 5, feedbackComment: "Friendly rider, very professional.", notes: "" },
      { id: "d-9791", customerName: "Solomon Otieno", customerPhone: "+254 722 119 553", address: "Galleria, Karen",              riderId: "r3", riderName: "Joe Otieno",  status: "delivered", dispatchedAt: now - 2*day - 5*60*60_000, deliveredAt: now - 2*day - 5*60*60_000 + 38*60_000, durationMin: 38, orderRating: 4, deliveryRating: 3, feedbackComment: "Delivery took longer than expected.", notes: "House 12, Marula Lane" },
      // ── 3-4 days ago
      { id: "d-9783", customerName: "Vincent Kamau",  customerPhone: "+254 731 088 442", address: "Junction Mall, Ngong Road",    status: "cancelled",  cancelledAt: now - 4*day, notes: "Customer cancelled by phone" },
      { id: "d-9778", customerName: "Sharon Akinyi",  customerPhone: "+254 705 644 219", address: "Lavington Mall, Lavington",    riderId: "r1", riderName: "Brian Kamau", status: "delivered", dispatchedAt: now - 5*day - 60*60_000, deliveredAt: now - 5*day - 60*60_000 + 21*60_000, durationMin: 21, orderRating: 5, deliveryRating: 5, notes: "" },
      // ── A week ago
      { id: "d-9770", customerName: "Felix Ouma",     customerPhone: "+254 798 220 117", address: "Sarit Centre, Westlands",      riderId: "r2", riderName: "Dan Mwangi",  status: "delivered", dispatchedAt: now - 7*day - 90*60_000, deliveredAt: now - 7*day - 90*60_000 + 33*60_000, durationMin: 33, orderRating: 3, deliveryRating: 3, feedbackComment: "Order was fine.", notes: "" },
      { id: "d-9762", customerName: "Beatrice Akinyi",customerPhone: "+254 720 559 884", address: "ABC Place, Waiyaki Way",       riderId: "r3", riderName: "Joe Otieno",  status: "delivered", dispatchedAt: now - 9*day - 4*60*60_000, deliveredAt: now - 9*day - 4*60*60_000 + 27*60_000, durationMin: 27, orderRating: 5, deliveryRating: 4, notes: "" },
      { id: "d-9750", customerName: "Lawrence Mutua", customerPhone: "+254 715 003 882", address: "Garden City Mall, Thika Road", riderId: "r2", riderName: "Dan Mwangi",  status: "failed",    dispatchedAt: now - 12*day - 60*60_000, deliveredAt: now - 12*day - 60*60_000 + 44*60_000, durationMin: 44, failureReason: "Wrong address", notes: "Block C, Apt 12" },
      { id: "d-9743", customerName: "Naomi Mumbi",    customerPhone: "+254 733 220 559", address: "Two Rivers Mall, Runda",       riderId: "r1", riderName: "Brian Kamau", status: "delivered", dispatchedAt: now - 14*day - 90*60_000, deliveredAt: now - 14*day - 90*60_000 + 26*60_000, durationMin: 26, orderRating: 5, deliveryRating: 5, notes: "" },
      // ── 3+ weeks ago
      { id: "d-9711", customerName: "George Mwita",   customerPhone: "+254 712 880 003", address: "Village Market, Gigiri",       riderId: "r3", riderName: "Joe Otieno",  status: "delivered", dispatchedAt: now - 21*day, deliveredAt: now - 21*day + 35*60_000, durationMin: 35, notes: "" },
      { id: "d-9702", customerName: "Cynthia Wairimu",customerPhone: "+254 728 110 553", address: "Prestige Plaza, Ngong Road",   status: "cancelled",  cancelledAt: now - 23*day, notes: "Out of stock — refunded" },
    ];
  })(),

  // Customer feedback (mix of positive/neutral/flagged)
  feedback: [
    {
      id: "f-9815",
      customerName: "Aisha Wanjiru",
      customerPhone: "+254 712 445 992",
      orderRating: 5,
      deliveryRating: 5,
      sentiment: "positive",
      topics: ["fast delivery", "friendly rider"],
      comment: "Brian arrived exactly on time, package was perfect!",
      submittedAt: m(95),
      riderName: "Brian Kamau",
    },
    {
      id: "f-9809",
      customerName: "Joy Otieno",
      customerPhone: "+254 720 558 311",
      orderRating: 4,
      deliveryRating: 2,
      sentiment: "negative",
      topics: ["late delivery", "wrong address"],
      comment: "Rider called 3 times from the wrong estate, took 2 extra hours to find me.",
      submittedAt: m(140),
      riderName: "Dan Mwangi",
      flagged: true,
    },
    {
      id: "f-9810",
      customerName: "Kevin Ochieng",
      customerPhone: "+254 733 902 884",
      orderRating: 5,
      deliveryRating: 4,
      sentiment: "positive",
      topics: ["careful handling"],
      comment: null,
      submittedAt: m(230),
      riderName: "Joe Otieno",
    },
    {
      id: "f-9813",
      customerName: "Wambui Kariuki",
      customerPhone: "+254 711 220 449",
      orderRating: 3,
      deliveryRating: 3,
      sentiment: "neutral",
      topics: ["average"],
      comment: "Was okay, nothing special.",
      submittedAt: m(320),
      riderName: "Brian Kamau",
    },
  ],
};

// Sample data — loaded by the "Load sample data" banner for empty accounts.
// One rider + 2 deliveries (one unassigned, one delivered).
window.PELEKA_SAMPLE = {
  riders: [
    { id: "sr-1", name: "Test Rider", phone: "+254 700 000 001", completed: 1, rating: 4.5, isSample: true },
  ],
  deliveries: [
    { id: "sd-1", customerName: "Test Customer",   customerPhone: "+254 700 000 002", address: "Sarit Centre, Westlands",  notes: "Sample delivery — feel free to delete", status: "unassigned", createdAt: NOW - 5 * 60_000, lat: -1.2614, lng: 36.8019, isSample: true },
    { id: "sd-2", customerName: "Test Customer 2", customerPhone: "+254 700 000 003", address: "Village Market, Gigiri",   notes: "Sample delivery — feel free to delete", status: "delivered",  riderId: "sr-1", riderName: "Test Rider", createdAt: NOW - 130 * 60_000, deliveredAt: NOW - 90 * 60_000, lat: -1.2336, lng: 36.8045, isSample: true },
  ],
};

window.PELEKA_FMT = {
  time: (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  ago: (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + "s ago";
    const mn = Math.floor(s / 60);
    if (mn < 60) return mn + "m ago";
    const h = Math.floor(mn / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  },
};
