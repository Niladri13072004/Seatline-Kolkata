"use client";

import { useEffect } from "react";
import { registerTools } from "@nekuda/webmcp-sdk";
import {
  SEATLINE_WEBMCP_TOOLS,
  setSeatlineWebMcpBridge,
  type SeatlineWebMcpBridge,
} from "./seatlineTools";

type SeatlineWebMcpRegistrarProps = {
  bridge: SeatlineWebMcpBridge;
};

export default function SeatlineWebMcpRegistrar({
  bridge,
}: SeatlineWebMcpRegistrarProps) {
  useEffect(() => {
    setSeatlineWebMcpBridge(bridge);
    const registration = registerTools(SEATLINE_WEBMCP_TOOLS, {
      telemetry: false,
    });

    return () => {
      registration.unregister();
      setSeatlineWebMcpBridge(null);
    };
  }, [bridge]);

  return null;
}
