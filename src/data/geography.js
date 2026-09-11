// ---------------------------------------------------------------------------
// Geography master — Fields 13–17 (City / District / State / Pincode / Country)
// and Field 23 (Region / Zone / Branch, "as per Pincode and hierarchy").
//
// Pincode is the single source of truth: every lead's district, city, state,
// branch, region and zone are DERIVED from it, exactly as the spec requires.
// Real pincodes are used so the demo looks credible to the client.
// ---------------------------------------------------------------------------

export const ZONES = ['West Zone', 'North Zone', 'South Zone', 'East Zone']

export const BRANCHES = [
  // ---------------------------------------------------------------- West Zone
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Mumbai Suburban', city: 'Mumbai',   branch: 'Mumbai — Bandra',        code: 'BR-MUM-01', pincodes: ['400050', '400051', '400052', '400053', '400054'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Mumbai Suburban', city: 'Mumbai',   branch: 'Mumbai — Andheri',       code: 'BR-MUM-02', pincodes: ['400058', '400059', '400061', '400064', '400069'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Mumbai',          city: 'Mumbai',   branch: 'Mumbai — Fort',          code: 'BR-MUM-03', pincodes: ['400001', '400005', '400020', '400021', '400023'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Mumbai Suburban', city: 'Mumbai',   branch: 'Mumbai — Powai',         code: 'BR-MUM-04', pincodes: ['400072', '400076', '400087', '400097', '400101'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Thane',           city: 'Thane',    branch: 'Thane — Ghodbunder',     code: 'BR-THN-01', pincodes: ['400601', '400602', '400607', '400610', '400615'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Pune',            city: 'Pune',     branch: 'Pune — Shivajinagar',    code: 'BR-PUN-01', pincodes: ['411001', '411004', '411005', '411016', '411030'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Pune',            city: 'Pune',     branch: 'Pune — Wakad',           code: 'BR-PUN-02', pincodes: ['411045', '411057', '411027', '411033', '411061'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Nashik',          city: 'Nashik',   branch: 'Nashik — College Road',  code: 'BR-NSK-01', pincodes: ['422001', '422002', '422005', '422007', '422011'] },
  { zone: 'West Zone', region: 'Maharashtra Region', state: 'Maharashtra', district: 'Nagpur',          city: 'Nagpur',   branch: 'Nagpur — Dharampeth',    code: 'BR-NGP-01', pincodes: ['440001', '440010', '440012', '440015', '440022'] },
  { zone: 'West Zone', region: 'Gujarat Region',     state: 'Gujarat',     district: 'Ahmedabad',       city: 'Ahmedabad', branch: 'Ahmedabad — CG Road',   code: 'BR-AMD-01', pincodes: ['380001', '380006', '380009', '380015', '380054'] },
  { zone: 'West Zone', region: 'Gujarat Region',     state: 'Gujarat',     district: 'Ahmedabad',       city: 'Ahmedabad', branch: 'Ahmedabad — Satellite', code: 'BR-AMD-02', pincodes: ['380052', '380051', '380058', '380059', '380061'] },
  { zone: 'West Zone', region: 'Gujarat Region',     state: 'Gujarat',     district: 'Surat',           city: 'Surat',    branch: 'Surat — Adajan',         code: 'BR-SUR-01', pincodes: ['395001', '395007', '395009', '395010', '395017'] },
  { zone: 'West Zone', region: 'Gujarat Region',     state: 'Gujarat',     district: 'Vadodara',        city: 'Vadodara', branch: 'Vadodara — Alkapuri',    code: 'BR-VAD-01', pincodes: ['390001', '390005', '390007', '390020', '390023'] },
  { zone: 'West Zone', region: 'Gujarat Region',     state: 'Gujarat',     district: 'Rajkot',          city: 'Rajkot',   branch: 'Rajkot — Kalawad Road',  code: 'BR-RAJ-01', pincodes: ['360001', '360002', '360004', '360005', '360007'] },

  // --------------------------------------------------------------- North Zone
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Delhi',         district: 'New Delhi',     city: 'New Delhi', branch: 'Delhi — Connaught Place', code: 'BR-DEL-01', pincodes: ['110001', '110002', '110003', '110011', '110021'] },
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Delhi',         district: 'South Delhi',   city: 'New Delhi', branch: 'Delhi — Saket',           code: 'BR-DEL-02', pincodes: ['110017', '110019', '110025', '110048', '110065'] },
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Delhi',         district: 'West Delhi',    city: 'New Delhi', branch: 'Delhi — Rajouri Garden',  code: 'BR-DEL-03', pincodes: ['110015', '110026', '110027', '110058', '110063'] },
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Haryana',       district: 'Gurugram',      city: 'Gurugram',  branch: 'Gurugram — Cyber City',   code: 'BR-GUR-01', pincodes: ['122001', '122002', '122008', '122009', '122018'] },
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Haryana',       district: 'Faridabad',     city: 'Faridabad', branch: 'Faridabad — Sector 15',   code: 'BR-FBD-01', pincodes: ['121001', '121002', '121003', '121006', '121007'] },
  { zone: 'North Zone', region: 'Delhi NCR Region',  state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', city: 'Noida', branch: 'Noida — Sector 62',    code: 'BR-NOI-01', pincodes: ['201301', '201303', '201304', '201305', '201309'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Uttar Pradesh', district: 'Lucknow',      city: 'Lucknow',   branch: 'Lucknow — Hazratganj',    code: 'BR-LKO-01', pincodes: ['226001', '226003', '226010', '226016', '226024'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Uttar Pradesh', district: 'Kanpur Nagar', city: 'Kanpur',    branch: 'Kanpur — Civil Lines',    code: 'BR-KNP-01', pincodes: ['208001', '208002', '208004', '208005', '208011'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Punjab',       district: 'Ludhiana',      city: 'Ludhiana',  branch: 'Ludhiana — Mall Road',    code: 'BR-LDH-01', pincodes: ['141001', '141002', '141003', '141008', '141010'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Punjab',       district: 'Amritsar',      city: 'Amritsar',  branch: 'Amritsar — Lawrence Road', code: 'BR-ASR-01', pincodes: ['143001', '143002', '143005', '143006', '143008'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Rajasthan',    district: 'Jaipur',        city: 'Jaipur',    branch: 'Jaipur — C Scheme',       code: 'BR-JAI-01', pincodes: ['302001', '302004', '302005', '302015', '302020'] },
  { zone: 'North Zone', region: 'North India Region', state: 'Rajasthan',    district: 'Jodhpur',       city: 'Jodhpur',   branch: 'Jodhpur — Sardarpura',    code: 'BR-JDH-01', pincodes: ['342001', '342003', '342005', '342008', '342011'] },

  // --------------------------------------------------------------- South Zone
  { zone: 'South Zone', region: 'Karnataka Region',  state: 'Karnataka',  district: 'Bengaluru Urban', city: 'Bengaluru', branch: 'Bengaluru — Koramangala', code: 'BR-BLR-01', pincodes: ['560034', '560095', '560029', '560047', '560071'] },
  { zone: 'South Zone', region: 'Karnataka Region',  state: 'Karnataka',  district: 'Bengaluru Urban', city: 'Bengaluru', branch: 'Bengaluru — Whitefield',  code: 'BR-BLR-02', pincodes: ['560066', '560048', '560037', '560067', '560103'] },
  { zone: 'South Zone', region: 'Karnataka Region',  state: 'Karnataka',  district: 'Bengaluru Urban', city: 'Bengaluru', branch: 'Bengaluru — Jayanagar',   code: 'BR-BLR-03', pincodes: ['560011', '560041', '560069', '560070', '560082'] },
  { zone: 'South Zone', region: 'Karnataka Region',  state: 'Karnataka',  district: 'Mysuru',          city: 'Mysuru',    branch: 'Mysuru — Saraswathipuram', code: 'BR-MYS-01', pincodes: ['570001', '570009', '570011', '570023', '570025'] },
  { zone: 'South Zone', region: 'Karnataka Region',  state: 'Karnataka',  district: 'Dharwad',         city: 'Hubballi',  branch: 'Hubballi — Vidyanagar',   code: 'BR-HBL-01', pincodes: ['580020', '580021', '580023', '580025', '580029'] },
  { zone: 'South Zone', region: 'Tamil Nadu Region', state: 'Tamil Nadu', district: 'Chennai',         city: 'Chennai',   branch: 'Chennai — T Nagar',       code: 'BR-CHN-01', pincodes: ['600017', '600018', '600024', '600033', '600035'] },
  { zone: 'South Zone', region: 'Tamil Nadu Region', state: 'Tamil Nadu', district: 'Chennai',         city: 'Chennai',   branch: 'Chennai — Adyar',         code: 'BR-CHN-02', pincodes: ['600020', '600028', '600041', '600090', '600096'] },
  { zone: 'South Zone', region: 'Tamil Nadu Region', state: 'Tamil Nadu', district: 'Coimbatore',      city: 'Coimbatore', branch: 'Coimbatore — RS Puram',  code: 'BR-CBE-01', pincodes: ['641002', '641012', '641018', '641037', '641045'] },
  { zone: 'South Zone', region: 'Tamil Nadu Region', state: 'Tamil Nadu', district: 'Madurai',         city: 'Madurai',   branch: 'Madurai — Anna Nagar',    code: 'BR-MDU-01', pincodes: ['625001', '625002', '625007', '625014', '625020'] },
  { zone: 'South Zone', region: 'Telangana Region',  state: 'Telangana',  district: 'Hyderabad',       city: 'Hyderabad', branch: 'Hyderabad — Banjara Hills', code: 'BR-HYD-01', pincodes: ['500034', '500033', '500073', '500082', '500096'] },
  { zone: 'South Zone', region: 'Telangana Region',  state: 'Telangana',  district: 'Rangareddy',      city: 'Hyderabad', branch: 'Hyderabad — Gachibowli',  code: 'BR-HYD-02', pincodes: ['500032', '500019', '500049', '500084', '500089'] },
  { zone: 'South Zone', region: 'Telangana Region',  state: 'Telangana',  district: 'Warangal',        city: 'Warangal',  branch: 'Warangal — Hanamkonda',   code: 'BR-WGL-01', pincodes: ['506001', '506002', '506004', '506007', '506009'] },
  { zone: 'South Zone', region: 'Kerala & AP Region', state: 'Kerala',    district: 'Ernakulam',       city: 'Kochi',     branch: 'Kochi — Kaloor',          code: 'BR-COK-01', pincodes: ['682017', '682018', '682024', '682025', '682036'] },
  { zone: 'South Zone', region: 'Kerala & AP Region', state: 'Kerala',    district: 'Thiruvananthapuram', city: 'Thiruvananthapuram', branch: 'Trivandrum — Vazhuthacaud', code: 'BR-TRV-01', pincodes: ['695001', '695010', '695014', '695024', '695035'] },
  { zone: 'South Zone', region: 'Kerala & AP Region', state: 'Andhra Pradesh', district: 'Krishna',    city: 'Vijayawada', branch: 'Vijayawada — MG Road',   code: 'BR-VJA-01', pincodes: ['520001', '520002', '520008', '520010', '520013'] },
  { zone: 'South Zone', region: 'Kerala & AP Region', state: 'Andhra Pradesh', district: 'Visakhapatnam', city: 'Visakhapatnam', branch: 'Vizag — Dwaraka Nagar', code: 'BR-VTZ-01', pincodes: ['530016', '530002', '530003', '530013', '530020'] },

  // ---------------------------------------------------------------- East Zone
  { zone: 'East Zone', region: 'West Bengal Region', state: 'West Bengal', district: 'Kolkata',   city: 'Kolkata',     branch: 'Kolkata — Park Street',  code: 'BR-KOL-01', pincodes: ['700016', '700017', '700019', '700020', '700071'] },
  { zone: 'East Zone', region: 'West Bengal Region', state: 'West Bengal', district: 'Kolkata',   city: 'Kolkata',     branch: 'Kolkata — Salt Lake',    code: 'BR-KOL-02', pincodes: ['700064', '700091', '700102', '700105', '700106'] },
  { zone: 'East Zone', region: 'West Bengal Region', state: 'West Bengal', district: 'Howrah',    city: 'Howrah',      branch: 'Howrah — Shibpur',       code: 'BR-HWH-01', pincodes: ['711101', '711102', '711103', '711104', '711106'] },
  { zone: 'East Zone', region: 'West Bengal Region', state: 'West Bengal', district: 'Darjeeling', city: 'Siliguri',   branch: 'Siliguri — Sevoke Road', code: 'BR-SLG-01', pincodes: ['734001', '734003', '734004', '734005', '734006'] },
  { zone: 'East Zone', region: 'East India Region',  state: 'Odisha',      district: 'Khordha',   city: 'Bhubaneswar', branch: 'Bhubaneswar — Saheed Nagar', code: 'BR-BBS-01', pincodes: ['751001', '751007', '751010', '751015', '751024'] },
  { zone: 'East Zone', region: 'East India Region',  state: 'Odisha',      district: 'Cuttack',   city: 'Cuttack',     branch: 'Cuttack — Buxi Bazaar',  code: 'BR-CTC-01', pincodes: ['753001', '753002', '753008', '753012', '753014'] },
  { zone: 'East Zone', region: 'East India Region',  state: 'Bihar',       district: 'Patna',     city: 'Patna',       branch: 'Patna — Boring Road',    code: 'BR-PAT-01', pincodes: ['800001', '800013', '800014', '800020', '800023'] },
  { zone: 'East Zone', region: 'East India Region',  state: 'Assam',       district: 'Kamrup Metro', city: 'Guwahati', branch: 'Guwahati — GS Road',     code: 'BR-GAU-01', pincodes: ['781001', '781005', '781006', '781007', '781028'] },
  { zone: 'East Zone', region: 'East India Region',  state: 'Jharkhand',   district: 'Ranchi',    city: 'Ranchi',      branch: 'Ranchi — Main Road',     code: 'BR-RNC-01', pincodes: ['834001', '834002', '834003', '834008', '834009'] },
]

/** Pincodes deliberately left unmapped, to demo the Unallocated Queue. */
export const UNMAPPED_PINCODES = [
  { pincode: '504001', city: 'Adilabad',   district: 'Adilabad',   state: 'Telangana' },
  { pincode: '515001', city: 'Anantapur',  district: 'Anantapur',  state: 'Andhra Pradesh' },
  { pincode: '785001', city: 'Jorhat',     district: 'Jorhat',     state: 'Assam' },
]

export const STATES = [...new Set(BRANCHES.map((b) => b.state))].sort()
export const DISTRICTS = [...new Set(BRANCHES.map((b) => b.district))].sort()
export const CITIES = [...new Set(BRANCHES.map((b) => b.city))].sort()
export const REGIONS = [...new Set(BRANCHES.map((b) => b.region))]

/** pincode -> { zone, region, state, district, city, branch, code } */
export const PINCODE_MAP = (() => {
  const map = {}
  for (const b of BRANCHES) {
    for (const pin of b.pincodes) {
      map[pin] = {
        pincode: pin,
        zone: b.zone,
        region: b.region,
        state: b.state,
        district: b.district,
        city: b.city,
        branch: b.branch,
        branchCode: b.code,
      }
    }
  }
  for (const u of UNMAPPED_PINCODES) {
    map[u.pincode] = { ...u, zone: null, region: null, branch: null, branchCode: null }
  }
  return map
})()

/** Field 23 — the derived "Region / Zone / Branch" display value. */
export const resolvePincode = (pincode) => PINCODE_MAP[pincode] || null
export const regionZoneBranch = (geo) =>
  geo && geo.branch ? `${geo.branch} · ${geo.region} · ${geo.zone}` : 'UNALLOCATED'
