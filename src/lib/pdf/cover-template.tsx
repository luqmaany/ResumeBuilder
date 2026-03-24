import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  date: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 10,
    color: "#555",
  },
  greeting: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  closing: {
    marginTop: 20,
  },
  signature: {
    marginTop: 24,
    fontWeight: "bold",
  },
});

interface CoverLetterData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  companyName: string;
  roleTitle: string;
  coverLetterBody: string;
}

export function CoverLetterDocument({ data }: { data: CoverLetterData }) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paragraphs = data.coverLetterBody
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.fullName}</Text>
          {data.email && <Text style={styles.contactInfo}>{data.email}</Text>}
          {data.phone && <Text style={styles.contactInfo}>{data.phone}</Text>}
          {data.location && <Text style={styles.contactInfo}>{data.location}</Text>}
        </View>

        <Text style={styles.date}>{today}</Text>

        <Text style={styles.greeting}>
          Dear Hiring Manager,
        </Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}

        <View style={styles.closing}>
          <Text>Sincerely,</Text>
          <Text style={styles.signature}>{data.fullName}</Text>
        </View>
      </Page>
    </Document>
  );
}
