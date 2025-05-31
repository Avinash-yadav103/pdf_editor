"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Upload, Download, ChevronLeft, ChevronRight, Type, Eraser, CloudyIcon as Blur, RotateCcw, Move, Check, X } from "lucide-react"

interface EditAction {
  type: "blur" | "erase" | "text"
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  // Store the scale at which the action was created
  scale?: number
}

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [editMode, setEditMode] = useState<"view" | "move" | "blur" | "erase" | "text">("view")
  const [editActions, setEditActions] = useState<EditAction[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [fontSize, setFontSize] = useState(16)
  const [blurRadius, setBlurRadius] = useState(5)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  // Add state for the selected export format
  const [exportFormat, setExportFormat] = useState<"pdf" | "png" | "jpeg">("pdf")

  // Text input states
  const [textInputActive, setTextInputActive] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [textBoxScreenPosition, setTextBoxScreenPosition] = useState({ x: 0, y: 0 });

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

    // Load pdf-lib for PDF editing
    const scriptPdfLib = document.createElement("script")
    scriptPdfLib.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"
    document.head.appendChild(scriptPdfLib)

    return () => {
      document.head.removeChild(script)
      document.head.removeChild(scriptPdfLib)
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

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.translate(panOffset.x, panOffset.y)
    
    await page.render(renderContext).promise
    applyEditActions(context)
    
    context.restore()
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
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setStartPos({ x, y })
    
    if (editMode === "move") {
      setIsPanning(true)
      document.body.style.cursor = "grabbing"
    } else if (editMode === "view") {
      return
    } else if (editMode === "text") {
      // Get actual canvas position for drawing the text later
      const drawX = x - panOffset.x;
      const drawY = y - panOffset.y;
      
      // Store the position for drawing
      setTextInputPosition({ x: drawX, y: drawY });
      
      // Store screen coordinates for positioning the text box
      setTextBoxScreenPosition({ x: event.clientX, y: event.clientY });
      
      setTextInputActive(true);
      setTextInputValue("");
    } else {
      setIsDrawing(true)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && editMode === "move") {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      const deltaX = x - startPos.x
      const deltaY = y - startPos.y
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setStartPos({ x, y })
      
      if (pdfDoc) renderPage(pdfDoc, currentPage)
    }
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false)
      document.body.style.cursor = "default"
      return
    }
    
    if (!isDrawing || editMode === "view" || editMode === "text" || editMode === "move") return

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
    if (!canvasRef.current || !pdfDoc || !pdfFile) return

    if (exportFormat === "pdf") {
      try {
        // Create a new PDF document
        // @ts-ignore
        const PDFLib = window.PDFLib
        if (!PDFLib) {
          alert("PDF-lib not loaded. Please try again.")
          return
        }

        // Load the original PDF
        const existingPdfBytes = await pdfFile.arrayBuffer()
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes)
        
        // Get the current page
        const pages = pdfDoc.getPages()
        const currentPageObj = pages[currentPage - 1]
        
        // Convert canvas to image
        const canvas = canvasRef.current
        const imageData = canvas.toDataURL('image/png')
        const pngImage = await pdfDoc.embedPng(imageData)
        
        // Calculate scaling to cover the page
        const { width, height } = currentPageObj.getSize()
        
        // Draw the edited canvas onto the PDF page
        currentPageObj.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        })
        
        // Save and download
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `edited-${pdfFile.name}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error("Error saving as PDF:", err)
        alert("Error saving as PDF. Falling back to PNG format.")
        downloadAsImage("png")
      }
    } else {
      downloadAsImage(exportFormat)
    }
  }

  const downloadAsImage = (format: "png" | "jpeg") => {
    if (!canvasRef.current) return

    const mimeType = format === "png" ? "image/png" : "image/jpeg"
    const fileExtension = format === "png" ? "png" : "jpg"
    
    // Convert canvas to blob and download
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `edited-${pdfFile?.name || "document"}.${fileExtension}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      },
      mimeType,
      format === "jpeg" ? 0.9 : undefined
    )
  }

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage)
    }
  }, [scale])

  // Add a function to handle text submission
  const handleTextSubmit = () => {
    if (textInputValue.trim()) {
      const newAction: EditAction = {
        type: "text",
        x: textInputPosition.x,
        y: textInputPosition.y,
        text: textInputValue,
        fontSize,
      }
      setEditActions((prev) => [...prev, newAction]);
      if (pdfDoc) renderPage(pdfDoc, currentPage);
    }
    setTextInputActive(false);
  }

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
                    <Button
                      variant={editMode === "move" ? "default" : "outline"}
                      onClick={() => setEditMode("move")}
                      className="w-full"
                    >
                      <Move className="w-4 h-4 mr-2" />
                      Move/Pan
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
                      <Label className="text-sm font-medium">Zoom Level (%)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={Math.round(scale * 100)}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 50 && value <= 300) {
                              setScale(value / 100)
                            }
                          }}
                          min="50"
                          max="300"
                          step="10"
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
                        >
                          -
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Font Size (px)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={fontSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 8 && value <= 48) {
                              setFontSize(value)
                            }
                          }}
                          min="8"
                          max="48"
                          step="1"
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFontSize((prev) => Math.max(prev - 1, 8))}
                        >
                          -
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFontSize((prev) => Math.min(prev + 1, 48))}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Blur Radius (px)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={blurRadius}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 1 && value <= 20) {
                              setBlurRadius(value)
                            }
                          }}
                          min="1"
                          max="20"
                          step="1"
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBlurRadius((prev) => Math.max(prev - 1, 1))}
                        >
                          -
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBlurRadius((prev) => Math.min(prev + 1, 20))}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="mb-2">
                      <Label className="text-sm font-medium mb-1">Export Format</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={exportFormat === "pdf" ? "default" : "outline"}
                          onClick={() => setExportFormat("pdf")}
                          className="flex-1"
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant={exportFormat === "png" ? "default" : "outline"}
                          onClick={() => setExportFormat("png")}
                          className="flex-1"
                        >
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant={exportFormat === "jpeg" ? "default" : "outline"}
                          onClick={() => setExportFormat("jpeg")}
                          className="flex-1"
                        >
                          JPEG
                        </Button>
                      </div>
                    </div>
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
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={() => {
                              setIsDrawing(false)
                              setIsPanning(false)
                              document.body.style.cursor = "default"
                            }}
                            className={`max-w-full h-auto ${
                              editMode === "move" ? "cursor-grab" : 
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
                        • <strong>Move Tool:</strong> Click and drag to pan around the PDF
                      </li>
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
                        • <strong>Download:</strong> Save your edited PDF in PDF, PNG, or JPEG format
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline Text Input */}
      {textInputActive && (
        <div 
          className="fixed z-50"
          style={{ 
            left: `${textBoxScreenPosition.x}px`, 
            top: `${textBoxScreenPosition.y - 10}px`,
            transform: 'none' 
          }}
        >
          <div className="bg-white rounded border-2 border-blue-400 shadow-lg p-1 flex flex-col min-w-[180px]">
            <Textarea
              ref={textInputRef}
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="Type here..."
              className="text-sm p-1 border-0 focus:ring-0 resize-none"
              rows={2}
              style={{ fontSize: `${fontSize}px` }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  setTextInputActive(false);
                }
              }}
              autoFocus
            />
            <div className="flex justify-between mt-1 gap-1">
              <div className="text-xs text-gray-500 self-center">
                Press Enter to add
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-1 py-0 text-xs"
                  onClick={() => setTextInputActive(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2 py-0 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={handleTextSubmit}
                >
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
