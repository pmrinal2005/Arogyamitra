"use client";
import { Card, CardBody } from "@/components/ui";
import EmaForm from "@/components/dashboard/EmaForm";

export default function QuickCheckin() {
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quick Check-In · ~15 seconds
        </p>
        <EmaForm compact />
      </CardBody>
    </Card>
  );
}
