export function AmazonDisclosure({ className = "text-muted-foreground" }: { className?: string }) {
  return (
    <p className={`mt-2 text-xs leading-relaxed ${className}`}>
      <strong className="font-semibold">Affiliate link:</strong> We may earn a commission from qualifying Amazon purchases. No cashback is offered.
    </p>
  );
}