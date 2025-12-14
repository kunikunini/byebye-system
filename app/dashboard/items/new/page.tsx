export default function NewItemPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">新規登録</h1>
      <form action="/api/items" method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary">item_type</label>
          <select
            name="itemType"
            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
          >
            <option value="VINYL">VINYL</option>
            <option value="CD">CD</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95"
        >
          登録
        </button>
      </form>
      <p className="text-sm text-gray-600">SKU は登録時に自動採番されます（例: BB-YYYYMMDD-0001）。</p>
    </div>
  );
}

