import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
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
    paddingVertical: 30,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 12,
    textAlign: "left",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2563eb",
    textTransform: "uppercase",
  },
  contactText: {
    fontSize: 9,
    color: "#444",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginTop: 2,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
    color: "#2563eb",
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 10,
    marginBottom: 4,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  expTitle: {
    fontWeight: "bold",
    fontSize: 10,
  },
  expCompany: {
    fontStyle: "italic",
    fontSize: 10,
  },
  expDates: {
    fontSize: 9,
    color: "#555",
  },
  bullet: {
    flexDirection: "row",
    marginLeft: 12,
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
  skillsText: {
    fontSize: 10,
  },
  eduHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eduDegree: {
    fontWeight: "bold",
    fontSize: 10,
  },
  eduSchool: {
    fontStyle: "italic",
    fontSize: 10,
  },
  section: {
    marginBottom: 8,
  },
  link: {
    color: "#1a1a1a",
    textDecoration: "none",
  },
});

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  experience: {
    id: string;
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate?: string;
    endDate: string;
    gpa: string;
  }[];
  skills: string[];
  hobbies: string[];
  projects: {
    id: string;
    name: string;
    technologies?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  }[];
  sectionConfig: {
    id: string;
    type: string;
    title: string;
    visible: boolean;
    order: number;
  }[];
}

export function ResumeDocument({ data }: { data: ResumeData }) {
  const visibleSections = [...data.sectionConfig]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const contactItems = [
    data.email ? `E: ${data.email}` : "",
    data.phone ? `M: ${data.phone}` : "",
    data.location ? `Loc: ${data.location}` : "",
    data.linkedin ? `in: ${data.linkedin}` : "",
    data.github ? `Git: ${data.github}` : "",
    data.website ? `www: ${data.website}` : "",
  ].filter(Boolean);

  const renderSection = (sec: ResumeData["sectionConfig"][0]) => {
    switch (sec.type) {
      case "summary":
        return data.summary ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        ) : null;

      case "experience":
        return data.experience.length > 0 ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            {data.experience.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 6 }}>
                <View style={styles.expHeader}>
                  <View>
                    <Text style={styles.expTitle}>{exp.title}</Text>
                    <Text style={styles.expCompany}>
                      {exp.company}
                      {exp.location ? `, ${exp.location}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.expDates}>
                    {exp.startDate} - {exp.endDate}
                  </Text>
                </View>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null;

      case "education":
        return data.education.length > 0 ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            {data.education.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 4 }}>
                <View style={styles.eduHeader}>
                  <View>
                    <Text style={styles.eduDegree}>
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
                    </Text>
                    <Text style={styles.eduSchool}>{edu.institution}</Text>
                  </View>
                  <Text style={styles.expDates}>
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" - ")}
                  </Text>
                </View>
                {edu.gpa ? (
                  <Text style={{ fontSize: 9, color: "#555", marginLeft: 12 }}>
                    GPA: {edu.gpa}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null;

      case "skills":
        return data.skills.length > 0 ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.skillsText}>{data.skills.join("  |  ")}</Text>
          </View>
        ) : null;

      case "projects":
        return data.projects.length > 0 ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            {data.projects.map((proj) => {
              const dateStr = [proj.startDate, proj.endDate].filter(Boolean).join(" - ");
              return (
                <View key={proj.id} style={{ marginBottom: 6 }}>
                  <View style={styles.expHeader}>
                    <View>
                      <Text style={styles.expTitle}>{proj.name}</Text>
                      {proj.technologies ? (
                        <Text style={styles.expCompany}>{proj.technologies}</Text>
                      ) : null}
                    </View>
                    {dateStr ? (
                      <Text style={styles.expDates}>{dateStr}</Text>
                    ) : null}
                  </View>
                  {proj.bullets.map((b, j) => (
                    <View key={j} style={styles.bullet}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null;

      case "hobbies":
        return data.hobbies.length > 0 ? (
          <View key={sec.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.skillsText}>{data.hobbies.join("  |  ")}</Text>
          </View>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.fullName}</Text>
          <Text style={styles.contactText}>
            {contactItems.join("  |  ")}
          </Text>
        </View>
        {visibleSections.map(renderSection)}
      </Page>
    </Document>
  );
}
