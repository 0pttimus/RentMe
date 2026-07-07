export default function Spinner({ size }: { size?: number }) {
  return (
    <div className="spinnerWrap">
      <div className="spinner" style={size ? { width: size, height: size } : undefined} />
    </div>
  );
}
