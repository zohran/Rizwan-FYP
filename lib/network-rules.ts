/**
 * Simulated lab/cafe network policy catalog.
 * Restricted ids are the only values accepted by POST /api/client/network-violation.
 * These are UI simulations for the FYP — they do not perform real network attacks.
 */

export type NetworkSeverity = 'medium' | 'high' | 'critical';
export type NetworkCategory = 'allowed' | 'restricted';

export type NetworkDestination = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: NetworkCategory;
  severity?: NetworkSeverity;
  actionLabel: string;
  policy: string;
  simulation: {
    heading: string;
    lines: string[];
    result: string;
  };
};

export const NETWORK_DESTINATIONS: NetworkDestination[] = [
  {
    id: 'campus_portal',
    title: 'Campus Portal',
    subtitle: 'intranet.lab.local',
    description: 'Official lab portal — email, timetable, and account tools.',
    category: 'allowed',
    actionLabel: 'Open portal',
    policy: 'Permitted destination on the lab allow-list.',
    simulation: {
      heading: 'Connected — campus portal',
      lines: [
        'TLS 1.3  ·  allow-listed host',
        'Authenticated via session token',
        'No policy flags raised',
      ],
      result: 'This destination is allowed. Admin was not notified.',
    },
  },
  {
    id: 'wikipedia',
    title: 'Wikipedia',
    subtitle: 'en.wikipedia.org',
    description: 'Reference lookup on a permitted public site.',
    category: 'allowed',
    actionLabel: 'Browse',
    policy: 'Permitted destination on the lab allow-list.',
    simulation: {
      heading: 'Connected — Wikipedia',
      lines: [
        'HTTPS GET  ·  content filter: pass',
        'Category: education / reference',
        'Bandwidth within session quota',
      ],
      result: 'This destination is allowed. Admin was not notified.',
    },
  },
  {
    id: 'news',
    title: 'News Feed',
    subtitle: 'news.lab-allow.local',
    description: 'Headlines from an allow-listed news aggregator.',
    category: 'allowed',
    actionLabel: 'Open feed',
    policy: 'Permitted destination on the lab allow-list.',
    simulation: {
      heading: 'Connected — news feed',
      lines: [
        'HTTPS  ·  allow-listed publisher set',
        'No blocked categories detected',
        'Idle timeout follows session timer',
      ],
      result: 'This destination is allowed. Admin was not notified.',
    },
  },
  {
    id: 'p2p_torrent',
    title: 'BitTorrent / P2P',
    subtitle: 'peer swarm · TCP/UDP 6881–6889',
    description: 'Start a simulated peer-to-peer download through the lab gateway.',
    category: 'restricted',
    severity: 'high',
    actionLabel: 'Start swarm',
    policy: 'P2P and torrent protocols are blocked on lab networks.',
    simulation: {
      heading: 'Torrent client — connecting to swarm',
      lines: [
        'Tracker announce  ·  magnet:?xt=urn:btih:…',
        'Opening listen port 6881 (simulated)',
        'DHT bootstrap peers: 8 connected',
        'Gateway DPI: BitTorrent handshake detected',
      ],
      result: 'P2P traffic violates lab policy. Administrator has been notified.',
    },
  },
  {
    id: 'vpn_proxy',
    title: 'VPN / Proxy tunnel',
    subtitle: 'encrypted outbound tunnel',
    description: 'Establish a simulated VPN or SOCKS proxy that bypasses content filters.',
    category: 'restricted',
    severity: 'high',
    actionLabel: 'Connect tunnel',
    policy: 'Unauthorized tunnels that bypass the lab gateway are forbidden.',
    simulation: {
      heading: 'VPN gateway — negotiating tunnel',
      lines: [
        'IKE / WireGuard handshake (simulated)',
        'Exit node: unregistered overlay network',
        'DNS leak protection: on',
        'Gateway: encrypted tunnel to unknown ASN',
      ],
      result: 'Unauthorized VPN/proxy use violates policy. Administrator has been notified.',
    },
  },
  {
    id: 'blocked_website',
    title: 'Blocked website',
    subtitle: 'gambling / high-risk category',
    description: 'Open a destination in a blocked content category.',
    category: 'restricted',
    severity: 'medium',
    actionLabel: 'Open site',
    policy: 'Gambling, adult, and other high-risk categories are filtered.',
    simulation: {
      heading: 'Browser — filtered destination',
      lines: [
        'GET https://wager-hub.example  (simulated)',
        'Category classifier: gambling',
        'Content filter: DENY',
        'Attempt logged against this session',
      ],
      result: 'Blocked-category access violates policy. Administrator has been notified.',
    },
  },
  {
    id: 'port_scan',
    title: 'Port scan',
    subtitle: 'host discovery · TCP SYN sweep',
    description: 'Run a simulated scan of common service ports on the lab subnet.',
    category: 'restricted',
    severity: 'critical',
    actionLabel: 'Start scan',
    policy: 'Reconnaissance and port scanning of lab hosts is forbidden.',
    simulation: {
      heading: 'Scanner — lab subnet (simulated)',
      lines: [
        'Target: 10.20.0.0/24 (lab VLAN)',
        'Probes: 22, 80, 443, 3389, 8080',
        'Open (sim): 22/tcp, 3389/tcp',
        'IDS: sequential SYN sweep from this station',
      ],
      result: 'Port scanning is a critical policy breach. Administrator has been notified.',
    },
  },
  {
    id: 'remote_desktop',
    title: 'Remote desktop / SSH',
    subtitle: 'outbound RDP 3389 · SSH 22',
    description: 'Open a simulated remote shell or desktop to an external host.',
    category: 'restricted',
    severity: 'critical',
    actionLabel: 'Connect remote',
    policy: 'Outbound remote-access protocols from client stations are forbidden.',
    simulation: {
      heading: 'Remote session — outbound (simulated)',
      lines: [
        'RDP / SSH client starting…',
        'Destination: 203.0.113.40:3389',
        'Credential prompt bypassed (demo)',
        'Firewall: unexpected outbound admin protocol',
      ],
      result: 'Unauthorized remote access violates policy. Administrator has been notified.',
    },
  },
  {
    id: 'covert_dns',
    title: 'Covert DNS channel',
    subtitle: 'data exfil via DNS queries',
    description: 'Simulate tunneling session data through DNS lookups to an external resolver.',
    category: 'restricted',
    severity: 'high',
    actionLabel: 'Start tunnel',
    policy: 'DNS tunneling and covert channels are treated as data exfiltration.',
    simulation: {
      heading: 'DNS tunnel — encoding payload (simulated)',
      lines: [
        'Resolver: 198.51.100.53 (not lab DNS)',
        'Query: aGVsbG8.exfil.example TXT',
        'NXDOMAIN rate: unusually high',
        'Detector: subdomain entropy above threshold',
      ],
      result: 'Covert DNS use violates policy. Administrator has been notified.',
    },
  },
];

export const RESTRICTED_RULE_IDS = NETWORK_DESTINATIONS.filter((d) => d.category === 'restricted').map(
  (d) => d.id
);

export function getNetworkDestination(id: string): NetworkDestination | undefined {
  return NETWORK_DESTINATIONS.find((d) => d.id === id);
}

export function getRestrictedRule(id: string): NetworkDestination | undefined {
  const dest = getNetworkDestination(id);
  return dest?.category === 'restricted' ? dest : undefined;
}

export const VIOLATION_DEDUP_MS = 15_000;
