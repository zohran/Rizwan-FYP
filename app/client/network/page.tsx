"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  Col,
  Modal,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  GlobalOutlined,
  LockOutlined,
  RadarChartOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  NETWORK_DESTINATIONS,
  type NetworkDestination,
} from "@/lib/network-rules";

const { Title, Text, Paragraph } = Typography;

type Session = {
  id: string;
  remainingTime: number;
  duration: number;
  machineId: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  medium: "gold",
  high: "orange",
  critical: "red",
};

function destIcon(dest: NetworkDestination) {
  if (dest.category === "allowed") return <SafetyCertificateOutlined />;
  if (dest.id === "port_scan") return <RadarChartOutlined />;
  if (dest.id === "vpn_proxy" || dest.id === "covert_dns")
    return <DisconnectOutlined />;
  if (dest.id === "blocked_website") return <StopOutlined />;
  return <WarningOutlined />;
}

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ClientNetworkPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<NetworkDestination | null>(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch("/api/sessions/active");
    const data = await res.json();
    if (!res.ok && res.status === 401) {
      router.push("/client/login");
      return;
    }
    if (!data.session) {
      router.push("/client/dashboard");
      return;
    }
    setSession(data.session);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;
    const i = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.remainingTime <= 0) return prev;
        return { ...prev, remainingTime: prev.remainingTime - 1 };
      });
    }, 1000);
    return () => clearInterval(i);
  }, [session?.id]);

  useEffect(() => {
    if (session && session.remainingTime <= 0) {
      fetch("/api/sessions/end", { method: "POST" })
        .then(() => fetch("/api/auth/logout", { method: "POST" }))
        .then(() => router.push("/client/login"))
        .catch(() => router.push("/client/login"));
    }
  }, [session?.remainingTime, router]);

  const allowed = useMemo(
    () => NETWORK_DESTINATIONS.filter((d) => d.category === "allowed"),
    [],
  );
  const restricted = useMemo(
    () => NETWORK_DESTINATIONS.filter((d) => d.category === "restricted"),
    [],
  );

  function openDest(dest: NetworkDestination) {
    setActive(dest);
    setProgress(0);
    setRunning(false);
    setFlagged(false);
    setResult(null);
  }

  async function runAction() {
    if (!active || running || submitting) return;
    setRunning(true);
    setProgress(8);
    const tick = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + 12));
    }, 180);

    try {
      if (active.category === "restricted") {
        setSubmitting(true);
        const res = await fetch("/api/client/network-violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: active.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          message.error(data.error ?? "Network request blocked");
          setRunning(false);
          setProgress(0);
          window.clearInterval(tick);
          setSubmitting(false);
          return;
        }
        setFlagged(true);
        setResult(data.message ?? active.simulation.result);
      } else {
        setFlagged(false);
        setResult(active.simulation.result);
      }
    } catch {
      message.error("Network error");
    } finally {
      window.clearInterval(tick);
      setProgress(100);
      setRunning(false);
      setSubmitting(false);
    }
  }

  if (loading || !session) {
    return <div style={{ minHeight: "100vh", background: "#111c44" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#111c44", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <Link href="/client/dashboard">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                style={{ color: "rgba(255,255,255,0.65)", paddingLeft: 0 }}
              >
                Back to session
              </Button>
            </Link>
            <Title level={3} style={{ color: "#fff", margin: "8px 0 4px" }}>
              <GlobalOutlined style={{ marginRight: 10, color: "#4fd1c5" }} />
              Network Access
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.45)" }}>
              Lab gateway · {session.machineId} ·{" "}
              {formatTime(session.remainingTime)} remaining
            </Text>
          </div>
          <Tag color="cyan" style={{ marginTop: 8 }}>
            Policy enforced
          </Tag>
        </div>

        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 24 }}
          title="This station is behind a monitored lab gateway"
          description="Allow-listed sites are fine. Restricted tools (P2P, VPN, scanning, remote access) are simulated policy breaks — they notify the administrator, who can terminate this session."
        />

        <Title
          level={5}
          style={{ color: "rgba(255,255,255,0.85)", marginBottom: 12 }}
        >
          Allow-listed
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {allowed.map((dest) => (
            <Col xs={24} sm={12} md={8} key={dest.id}>
              <Card
                hoverable
                onClick={() => openDest(dest)}
                style={{ height: "100%" }}
              >
                <Space>
                  <CheckCircleOutlined
                    style={{ color: "#38a169", fontSize: 18 }}
                  />
                  <Text strong>{dest.title}</Text>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dest.subtitle}
                  </Text>
                </div>
                <Paragraph
                  type="secondary"
                  style={{ marginTop: 8, marginBottom: 0 }}
                >
                  {dest.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>

        <Title
          level={5}
          style={{ color: "rgba(255,255,255,0.85)", marginBottom: 12 }}
        >
          Restricted — breaks network policy
        </Title>
        <Row gutter={[16, 16]}>
          {restricted.map((dest) => (
            <Col xs={24} sm={12} md={8} key={dest.id}>
              <Card
                hoverable
                onClick={() => openDest(dest)}
                style={{
                  height: "100%",
                  borderColor:
                    dest.severity === "critical" ? "#e53e3e55" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    {destIcon(dest)}
                    <Text strong>{dest.title}</Text>
                  </Space>
                  <Tag color={SEVERITY_COLOR[dest.severity ?? "medium"]}>
                    {(dest.severity ?? "medium").toUpperCase()}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dest.subtitle}
                </Text>
                <Paragraph
                  type="secondary"
                  style={{ marginTop: 8, marginBottom: 0 }}
                >
                  {dest.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Modal
        title={active ? active.simulation.heading : "Network"}
        open={!!active}
        onCancel={() => setActive(null)}
        footer={
          <Space>
            <Button onClick={() => setActive(null)}>Close</Button>
            <Button
              type="primary"
              danger={active?.category === "restricted"}
              loading={running || submitting}
              disabled={progress === 100}
              onClick={runAction}
            >
              {active?.actionLabel ?? "Run"}
            </Button>
          </Space>
        }
        width={560}
      >
        {active && (
          <>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {active.policy}
            </Paragraph>
            <Card
              size="small"
              style={{ background: "#0f172a", marginBottom: 16 }}
            >
              {active.simulation.lines.map((line) => (
                <div
                  key={line}
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: "#9ae6b4",
                    lineHeight: 1.8,
                  }}
                >
                  {line}
                </div>
              ))}
            </Card>
            {(running || progress > 0) && (
              <Progress
                percent={progress}
                status={
                  flagged ? "exception"
                  : progress === 100 ?
                    "success"
                  : "active"
                }
              />
            )}
            {result && (
              <Alert
                style={{ marginTop: 16 }}
                type={flagged ? "error" : "success"}
                showIcon
                title={
                  flagged ? "Policy violation reported" : "Destination allowed"
                }
                description={result}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
