export default function NewItemPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">新規登録</h1>
      <form action="/api/items" method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium">item_type</label>
          <select name="itemType" className="mt-1 rounded border px-3 py-2">
            <option value="VINYL">VINYL</option>
            <option value="CD">CD</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          登録
        </button>
      </form>
      <p className="text-sm text-gray-600">SKU は登録時に自動採番されます（例: BB-YYYYMMDD-0001）。</p>
    </div>
  );
}

