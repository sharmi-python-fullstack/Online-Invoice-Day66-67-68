import { useEffect, useState } from 'react'

const taxRates = {
  general: 0.18,
  materials: 0.28,
  services: 0.12,
}

const createItem = () => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  price: 0,
  category: 'general',
  autoDetected: false,
})

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toFixed(2)}`

const getToday = () => {
  const today = new Date()
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function App() {
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: 'INV-001',
    invoiceDate: getToday(),
    clientName: '',
    clientAddress: '',
  })
  const [invoiceItems, setInvoiceItems] = useState([createItem()])
  const [subtotal, setSubtotal] = useState(0)
  const [totalGST, setTotalGST] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  useEffect(() => {
    const nextSubtotal = invoiceItems.reduce(
      (total, item) => total + calculateItemTotal(item.quantity, item.price),
      0,
    )
    const nextGST = invoiceItems.reduce((total, item) => {
      const itemTotal = calculateItemTotal(item.quantity, item.price)
      return total + itemTotal * taxRates[item.category]
    }, 0)

    setSubtotal(nextSubtotal)
    setTotalGST(nextGST)
    setGrandTotal(nextSubtotal + nextGST)
  }, [invoiceItems])

  function calculateItemTotal(quantity, price) {
    return (Number(quantity) || 0) * (Number(price) || 0)
  }

  function autoDetectCategory(description) {
    const normalizedDescription = description.toLowerCase()

    if (normalizedDescription.includes('cement') || normalizedDescription.includes('steel')) {
      return 'materials'
    }
    if (normalizedDescription.includes('consulting')) {
      return 'services'
    }
    return 'general'
  }

  function updateInvoiceDetails(field, value) {
    setInvoiceDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }))
  }

  function updateItem(id, field, value) {
    setInvoiceItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    )
  }

  function updateDescription(id, description) {
    const detectedCategory = autoDetectCategory(description)

    setInvoiceItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              description,
              category: detectedCategory,
              autoDetected: detectedCategory !== item.category,
            }
          : item,
      ),
    )
  }

  function addItem() {
    setInvoiceItems((currentItems) => [...currentItems, createItem()])
  }

  function removeItem(id) {
    setInvoiceItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    )
  }

  async function generatePDF() {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(20)
    doc.text('Invoice Generator', 14, 20)
    doc.setFontSize(10)
    doc.text(`Invoice number: ${invoiceDetails.invoiceNumber || '—'}`, 14, 30)
    doc.text(`Invoice date: ${invoiceDetails.invoiceDate || '—'}`, 14, 36)
    doc.text(`Client: ${invoiceDetails.clientName || '—'}`, 14, 46)
    doc.text(`Address: ${invoiceDetails.clientAddress || '—'}`, 14, 52)

    autoTable(doc, {
      startY: 62,
      head: [['Description', 'Category', 'Qty', 'Price', 'Total']],
      body: invoiceItems.map((item) => [
        item.description || '—',
        item.category,
        String(Number(item.quantity) || 0),
        formatCurrency(item.price),
        formatCurrency(calculateItemTotal(item.quantity, item.price)),
      ]),
      headStyles: { fillColor: [35, 75, 65] },
      styles: { fontSize: 9, cellPadding: 3 },
    })

    let totalsY = (doc.lastAutoTable?.finalY ?? 62) + 12
    if (totalsY > doc.internal.pageSize.getHeight() - 22) {
      doc.addPage()
      totalsY = 20
    }
    doc.setFontSize(10)
    doc.text(`Subtotal: ${formatCurrency(subtotal)}`, pageWidth - 14, totalsY, {
      align: 'right',
    })
    doc.text(`Total GST: ${formatCurrency(totalGST)}`, pageWidth - 14, totalsY + 7, {
      align: 'right',
    })
    doc.setFontSize(12)
    doc.text(`Grand total: ${formatCurrency(grandTotal)}`, pageWidth - 14, totalsY + 16, {
      align: 'right',
    })

    doc.save(`${invoiceDetails.invoiceNumber || 'invoice'}.pdf`)
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="page-heading mb-8">
          <p className="eyebrow">BILLING MADE SIMPLE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Invoice Generator
          </h1>
          <p className="mt-2 text-base">
            Create a polished invoice and export it as a PDF.
          </p>
        </header>

        <section className="invoice-container rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
          <div className="section-heading">
            <div>
              <p className="eyebrow">INVOICE DETAILS</p>
              <h2 className="mt-1 text-xl font-semibold">Your invoice</h2>
            </div>
            <span className="draft-badge">DRAFT</span>
          </div>

          <div className="invoice-header mt-6 grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span>Invoice number</span>
              <input
                type="text"
                value={invoiceDetails.invoiceNumber}
                onChange={(event) =>
                  updateInvoiceDetails('invoiceNumber', event.target.value)
                }
                placeholder="INV-001"
              />
            </label>
            <label className="field">
              <span>Invoice date</span>
              <input
                type="date"
                value={invoiceDetails.invoiceDate}
                onChange={(event) =>
                  updateInvoiceDetails('invoiceDate', event.target.value)
                }
              />
            </label>
          </div>

          <div className="client-section mt-8">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BILL TO</p>
                <h2 className="mt-1 text-lg font-semibold">Client information</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Client name</span>
                <input
                  type="text"
                  value={invoiceDetails.clientName}
                  onChange={(event) =>
                    updateInvoiceDetails('clientName', event.target.value)
                  }
                  placeholder="e.g. Alex Morgan"
                />
              </label>
              <label className="field">
                <span>Client address</span>
                <input
                  type="text"
                  value={invoiceDetails.clientAddress}
                  onChange={(event) =>
                    updateInvoiceDetails('clientAddress', event.target.value)
                  }
                  placeholder="Street, city, postal code"
                />
              </label>
            </div>
          </div>

          <div className="items-section mt-9">
            <div className="section-heading mb-4">
              <div>
                <p className="eyebrow">WHAT YOU’RE CHARGING</p>
                <h2 className="mt-1 text-lg font-semibold">Invoice items</h2>
              </div>
            </div>

            <div className="items-table-wrap">
              <table className="items-table w-full">
                <thead>
                  <tr>
                    <th scope="col">Description</th>
                    <th scope="col">Category</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Price</th>
                    <th scope="col" className="text-right">Total</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Description">
                        <input
                          aria-label="Item description"
                          type="text"
                          value={item.description}
                          onChange={(event) =>
                            updateDescription(item.id, event.target.value)
                          }
                          placeholder="What did you provide?"
                        />
                      </td>
                      <td data-label="Category">
                        <div className="category-cell">
                          <select
                            aria-label="Item tax category"
                            value={item.category}
                            onChange={(event) => {
                              setInvoiceItems((currentItems) =>
                                currentItems.map((currentItem) =>
                                  currentItem.id === item.id
                                    ? {
                                        ...currentItem,
                                        category: event.target.value,
                                        autoDetected: false,
                                      }
                                    : currentItem,
                                ),
                              )
                            }}
                          >
                            {Object.keys(taxRates).map((category) => (
                              <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}{' '}
                                ({(taxRates[category] * 100).toFixed(0)}%)
                              </option>
                            ))}
                          </select>
                          {item.autoDetected && (
                            <span className="auto-detected">Auto-detected</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Quantity">
                        <input
                          aria-label="Item quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, 'quantity', event.target.value)
                          }
                        />
                      </td>
                      <td data-label="Price">
                        <input
                          aria-label="Item price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            updateItem(item.id, 'price', event.target.value)
                          }
                        />
                      </td>
                      <td data-label="Total" className="line-total text-right">
                        {formatCurrency(
                          calculateItemTotal(item.quantity, item.price),
                        )}
                      </td>
                      <td className="remove-cell">
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.description || 'item'}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="add-item-button mt-4" onClick={addItem}>
              <span aria-hidden="true">+</span> Add New Item
            </button>
          </div>

          <div className="invoice-footer mt-8 flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="tax-note">
              Tax is calculated automatically from each item’s category.
            </p>
            <div className="totals-summary" aria-live="polite">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div>
                <span>Total GST</span>
                <strong>{formatCurrency(totalGST)}</strong>
              </div>
              <div className="grand-total">
                <span>Grand total</span>
                <strong>{formatCurrency(grandTotal)}</strong>
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <button type="button" className="export-button" onClick={generatePDF}>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M10 2.5v9m0 0 3.25-3.25M10 11.5 6.75 8.25M3.5 13.5v2A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export as PDF
            </button>
          </div>
        </section>

        <section className="invoice-summary mt-6 rounded-2xl border p-5 shadow-sm sm:p-7">
          <div className="summary-top">
            <div>
              <p className="eyebrow">AT A GLANCE</p>
              <h2 className="mt-1 text-xl font-semibold">Invoice Summary</h2>
            </div>
            <span className="summary-number">
              {invoiceDetails.invoiceNumber || 'No invoice number'}
            </span>
          </div>
          <dl className="summary-details mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt>Invoice date</dt>
              <dd>{invoiceDetails.invoiceDate || '—'}</dd>
            </div>
            <div>
              <dt>Client name</dt>
              <dd>{invoiceDetails.clientName || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Client address</dt>
              <dd>{invoiceDetails.clientAddress || '—'}</dd>
            </div>
          </dl>
          <div className="summary-totals mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Total GST</span>
              <strong>{formatCurrency(totalGST)}</strong>
            </div>
            <div className="summary-grand-total">
              <span>Grand total</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>
          </div>
        </section>
        <footer className="page-footer py-8 text-center text-sm">
          Made for clear, simple billing.
        </footer>
      </div>
    </main>
  )
}

export default App
