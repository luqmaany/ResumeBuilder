import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  // ── Header: left (date + recipient) / right (name + contact) ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: {
    flex: 1,
    paddingTop: 4,
  },
  headerRight: {
    width: 190,
    alignItems: "flex-end",
  },
  name: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  roleTitle: {
    fontSize: 9.5,
    color: "#2563eb",
    fontStyle: "italic",
    marginBottom: 6,
    textAlign: "right",
  },
  contactLine: {
    fontSize: 8.5,
    color: "#444",
    marginBottom: 2,
    textAlign: "right",
  },
  dividerRight: {
    borderBottomWidth: 1,
    borderBottomColor: "#2563eb",
    marginBottom: 6,
    width: "100%",
  },
  date: {
    fontSize: 10,
    color: "#555",
    marginBottom: 14,
  },
  recipient: {
    fontSize: 10.5,
    marginBottom: 2,
  },
  subjectLine: {
    fontWeight: "bold",
    fontSize: 10.5,
    marginBottom: 14,
    marginTop: 4,
  },
  greeting: {
    marginBottom: 12,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  closing: {
    marginTop: 22,
  },
  signature: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 11,
  },
});

interface CoverLetterData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
  companyName: string;
  roleTitle: string;
  coverLetterBody: string;
}

export function CoverLetterDocument({ data }: { data: CoverLetterData }) {
  const today = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paragraphs = data.coverLetterBody
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const contactLines = [
    data.location,
    data.phone ? `M: ${data.phone}` : "",
    data.email ? `E: ${data.email}` : "",
    data.linkedin ? `in: ${data.linkedin}` : "",
    data.github ? `Git: ${data.github}` : "",
    data.website ? `www: ${data.website}` : "",
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Left: blank space to balance the layout */}
          <View style={styles.headerLeft} />

          {/* Right: name + role + contact */}
          <View style={styles.headerRight}>
            <Text style={styles.name}>{data.fullName}</Text>
            <View style={styles.dividerRight} />
            {data.roleTitle ? (
              <Text style={styles.roleTitle}>{data.roleTitle}</Text>
            ) : null}
            {contactLines.map((line, i) => (
              <Text key={i} style={styles.contactLine}>{line}</Text>
            ))}
          </View>
        </View>

        {/* ── Date ── */}
        <Text style={styles.date}>{today}</Text>

        {/* ── Recipient ── */}
        <Text style={styles.recipient}>The Hiring Manager</Text>
        <Text style={styles.recipient}>{data.companyName}</Text>

        {/* ── Subject ── */}
        <Text style={styles.subjectLine}>
          Re: Application for {data.roleTitle}
        </Text>

        {/* ── Greeting ── */}
        <Text style={styles.greeting}>Dear Hiring Manager,</Text>

        {/* ── Body ── */}
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}

        {/* ── Closing ── */}
        <View style={styles.closing}>
          <Text>Yours sincerely,</Text>
          <Text style={styles.signature}>{data.fullName}</Text>
        </View>

      </Page>
    </Document>
  );
}
