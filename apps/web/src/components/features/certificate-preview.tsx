export function CertificatePreview({ title, kind, recipientName, tournamentName, teamName, date, verificationCode, logoPath, layoutPath }: { title: string; kind: string; recipientName: string; tournamentName: string; teamName: string; date: string; verificationCode: string; logoPath?: string | null; layoutPath?: string | null }) {
  return <div className="certificate-preview">
    {layoutPath && <img alt="" className="certificate-layout" src={layoutPath} />}
    <div className="certificate-sheet">
      {logoPath && <img alt="" className="certificate-logo" src={logoPath} />}
      <p className="certificate-kicker">TYC TOURNAMENT CERTIFICATE</p>
      <h2>{title}</h2>
      <p>{kind}</p>
      <p>Presented to</p>
      <strong>{recipientName}</strong>
      <p>{tournamentName} · {teamName}</p>
      <p>{date}</p>
      <p className="certificate-code">{verificationCode}</p>
    </div>
  </div>;
}
