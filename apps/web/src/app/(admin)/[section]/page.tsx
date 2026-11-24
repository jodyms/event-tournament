import { notFound } from 'next/navigation';

// Named module routes live under (operations). This fallback intentionally exposes
// no data so misspelled/retired routes cannot bypass a module permission check.
export default function UnknownAdminSection() { notFound(); }
