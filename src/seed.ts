// Fictional sample contracts written for this demo.
export interface Clause {
  id: string;
  doc: string;
  title: string;
  text: string;
}

export const DOCS: Record<string, string> = {
  SAAS: "Acme Cloud SaaS Subscription Agreement (fictional)",
  NDA: "Mutual Non-Disclosure Agreement between Acme Cloud and Birch Labs (fictional)",
};

export const CLAUSES: Clause[] = [
  { id: "SAAS-2.1", doc: "SAAS", title: "Term and Renewal",
    text: "The initial term is twelve (12) months from the Effective Date. The agreement renews automatically for successive twelve-month terms unless either party gives written notice of non-renewal at least sixty (60) days before the end of the then-current term." },
  { id: "SAAS-3.1", doc: "SAAS", title: "Fees and Payment",
    text: "Customer shall pay all invoiced fees within thirty (30) days of the invoice date. Fees are quoted in US dollars and are non-refundable except as stated in Section 8.2." },
  { id: "SAAS-3.3", doc: "SAAS", title: "Late Payment",
    text: "Overdue amounts accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is lower. Provider may suspend the service if an undisputed invoice remains unpaid fifteen (15) days after written notice." },
  { id: "SAAS-5.1", doc: "SAAS", title: "Service Availability",
    text: "Provider will make the service available at least 99.9% of each calendar month, excluding scheduled maintenance announced at least 48 hours in advance." },
  { id: "SAAS-5.2", doc: "SAAS", title: "Service Credits",
    text: "If monthly availability falls below 99.9% but at least 99.0%, Customer receives a credit of 10% of that month's fees. Below 99.0%, the credit is 25%. Credits are Customer's sole remedy for availability failures." },
  { id: "SAAS-7.1", doc: "SAAS", title: "Data Protection",
    text: "Provider will process Customer Data only to provide the service, maintain industry-standard administrative, technical and physical safeguards, and notify Customer of a confirmed security breach affecting Customer Data within seventy-two (72) hours." },
  { id: "SAAS-8.2", doc: "SAAS", title: "Termination for Cause",
    text: "Either party may terminate this agreement on written notice if the other party materially breaches and fails to cure within thirty (30) days of notice. If Customer terminates for Provider's uncured breach, Provider will refund prepaid fees for the remaining term." },
  { id: "SAAS-9.1", doc: "SAAS", title: "Limitation of Liability",
    text: "Each party's total liability under this agreement is limited to the fees paid by Customer in the twelve (12) months before the claim arose. Neither party is liable for indirect or consequential damages." },
  { id: "NDA-2", doc: "NDA", title: "Definition of Confidential Information",
    text: "Confidential Information means non-public information disclosed by either party that is marked confidential or that a reasonable person would understand to be confidential. It excludes information that is public, independently developed, or already known to the recipient." },
  { id: "NDA-3", doc: "NDA", title: "Obligations of Recipient",
    text: "The recipient will use Confidential Information only to evaluate the proposed business relationship, protect it with at least reasonable care, and disclose it only to employees and advisers who need to know and are bound by similar duties." },
  { id: "NDA-4", doc: "NDA", title: "Term and Survival",
    text: "This NDA applies to disclosures made within two (2) years of the Effective Date. Obligations of confidentiality survive for three (3) years after termination or expiry." },
  { id: "NDA-5", doc: "NDA", title: "Compelled Disclosure",
    text: "If required by law or court order to disclose Confidential Information, the recipient will give the discloser prompt written notice where legally permitted and disclose only what is legally required." },
  { id: "NDA-7", doc: "NDA", title: "Return or Destruction",
    text: "Within fifteen (15) days of written request, the recipient will return or destroy all Confidential Information and confirm in writing. One archival copy may be kept where required by law." },
];
