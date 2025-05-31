"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Upload, Download, ChevronLeft, ChevronRight, Type, Eraser, CloudyIcon as Blur, RotateCcw } from "lucide-react"

interface EditAction {
  type: "blur" | "erase" | "text"
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
}

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [editMode, setEditMode] = useState<"view" | "blur" | "erase" | "text">("view")
  const [editActions, setEditActions] = useState<EditAction[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [textInput, setTextInput] = useState("")
  const [fontSize, setFontSize] = useState(16)
  const [blurRadius, setBlurRadius] = useState(5)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load PDF.js
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = () => {
      // @ts-ignore
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      const arrayBuffer = await file.arrayBuffer()

      // @ts-ignore
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setEditActions([])
      renderPage(pdf, 1)
    }
  }

  const renderPage = async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise
    applyEditActions(context)
  }

  const applyEditActions = (context: CanvasRenderingContext2D) => {
    editActions.forEach((action) => {
      if (action.type === "blur") {
        // Create blur effect
        const imageData = context.getImageData(action.x, action.y, action.width || 100, action.height || 50)
        context.filter = `blur(${blurRadius}px)`
        context.putImageData(imageData, action.x, action.y)
        context.filter = "none"
      } else if (action.type === "erase") {
        // Erase by drawing white rectangle
        context.fillStyle = "#ffffff"
        context.fillRect(action.x, action.y, action.width || 100, action.height || 50)
      } else if (action.type === "text") {
        // Add text
        context.fillStyle = "#000000"
        context.font = `${action.fontSize || fontSize}px Arial`
        context.fillText(action.text || "", action.x, action.y)
      }
    })
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode === "view") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setStartPos({ x, y })
    setIsDrawing(true)

    if (editMode === "text") {
      const text = prompt("Enter text:")
      if (text) {
        const newAction: EditAction = {
          type: "text",
          x,
          y,
          text,
          fontSize,
        }
        setEditActions((prev) => [...prev, newAction])
        if (pdfDoc) renderPage(pdfDoc, currentPage)
      }
    }
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || editMode === "view" || editMode === "text") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const width = Math.abs(x - startPos.x)
    const height = Math.abs(y - startPos.y)
    const minX = Math.min(x, startPos.x)
    const minY = Math.min(y, startPos.y)

    if (width > 5 && height > 5) {
      const newAction: EditAction = {
        type: editMode as "blur" | "erase",
        x: minX,
        y: minY,
        width,
        height,
      }
      setEditActions((prev) => [...prev, newAction])
      if (pdfDoc) renderPage(pdfDoc, currentPage)
    }

    setIsDrawing(false)
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (!pdfDoc) return

    let newPage = currentPage
    if (direction === "prev" && currentPage > 1) {
      newPage = currentPage - 1
    } else if (direction === "next" && currentPage < totalPages) {
      newPage = currentPage + 1
    }

    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      renderPage(pdfDoc, newPage)
    }
  }

  const clearActions = () => {
    setEditActions([])
    if (pdfDoc) renderPage(pdfDoc, currentPage)
  }

  const downloadPDF = async () => {
    if (!canvasRef.current) return

    // Convert canvas to blob and download
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `edited-${pdfFile?.name || "document"}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    })
  }

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage)
    }
  }, [scale])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Type className="w-6 h-6" />
              PDF Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Upload Section */}
              <div className="lg:w-1/4 space-y-4">
                <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <Label htmlFor="pdf-upload" className="text-sm font-medium text-gray-700">
                      Upload PDF File
                    </Label>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="mt-2"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </CardContent>
                </Card>

                {/* Tools */}
                <Card className="bg-gradient-to-br from-green-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Editing Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant={editMode === "view" ? "default" : "outline"}
                      onClick={() => setEditMode("view")}
                      className="w-full"
                    >
                      View Mode
                    </Button>
                    <Button
                      variant={editMode === "blur" ? "default" : "outline"}
                      onClick={() => setEditMode("blur")}
                      className="w-full"
                    >
                      <Blur className="w-4 h-4 mr-2" />
                      Blur Tool
                    </Button>
                    <Button
                      variant={editMode === "erase" ? "default" : "outline"}
                      onClick={() => setEditMode("erase")}
                      className="w-full"
                    >
                      <Eraser className="w-4 h-4 mr-2" />
                      Erase Tool
                    </Button>
                    <Button
                      variant={editMode === "text" ? "default" : "outline"}
                      onClick={() => setEditMode("text")}
                      className="w-full"
                    >
                      <Type className="w-4 h-4 mr-2" />
                      Add Text
                    </Button>
                  </CardContent>
                </Card>

                {/* Settings */}
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Zoom Level</Label>
                      <Slider
                        value={[scale]}
                        onValueChange={(value) => setScale(value[0])}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="mt-2"
                      />
                      <span className="text-xs text-gray-500">{Math.round(scale * 100)}%</span>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Font Size</Label>
                      <Slider
                        value={[fontSize]}
                        onValueChange={(value) => setFontSize(value[0])}
                        min={8}
                        max={48}
                        step={1}
                        className="mt-2"
                      />
                      <span className="text-xs text-gray-500">{fontSize}px</span>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Blur Radius</Label>
                      <Slider
                        value={[blurRadius]}
                        onValueChange={(value) => setBlurRadius(value[0])}
                        min={1}
                        max={20}
                        step={1}
                        className="mt-2"
                      />
                      <span className="text-xs text-gray-500">{blurRadius}px</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-4 space-y-2">
                    <Button onClick={clearActions} variant="outline" className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear Edits
                    </Button>
                    <Button
                      onClick={downloadPDF}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                      disabled={!pdfDoc}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* PDF Viewer */}
              <div className="lg:w-3/4">
                <Card className="bg-white shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pdfFile ? pdfFile.name : "No PDF loaded"}</CardTitle>
                      {pdfDoc && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigatePage("prev")}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm font-medium px-3 py-1 bg-white rounded">
                            {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigatePage("next")}
                            disabled={currentPage >= totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex justify-center">
                      {pdfDoc ? (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg">
                          <canvas
                            ref={canvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseUp={handleCanvasMouseUp}
                            className={`max-w-full h-auto ${
                              editMode !== "view" ? "cursor-crosshair" : "cursor-default"
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Upload className="w-16 h-16 mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Upload a PDF to get started</p>
                          <p className="text-sm">Drag and drop or click to browse</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructions */}
                <Card className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        • <strong>Blur Tool:</strong> Click and drag to select areas to blur
                      </li>
                      <li>
                        • <strong>Erase Tool:</strong> Click and drag to erase text sections
                      </li>
                      <li>
                        • <strong>Add Text:</strong> Click where you want to add text
                      </li>
                      <li>
                        • <strong>Navigation:</strong> Use the arrow buttons to navigate pages
                      </li>
                      <li>
                        • <strong>Download:</strong> Save your edited PDF as an image
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
