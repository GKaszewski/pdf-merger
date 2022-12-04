import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {jsPDF} from "jspdf";
import { Dialog } from '@headlessui/react';
import {Spinner} from "./components/spinner";

const PDFJS = require('pdfjs-dist/webpack')

function App() {
    const [fileTypeAccepted, setFileTypeAccepted] = useState("application/pdf");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isOpened, setIsOpened] = useState(false)

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const _files = event.target.files;
        const files = [];
        if (!_files) return;
        for (let i = 0; i < _files.length; i++) {
            const file = _files.item(i);
            files.push(file!);
        }

        setFiles(files);
    }

    const handleMergeButton = () => {
        createPdf()
    }

    const processImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image)
            image.onerror = reject;
            image.src = src;
        })
    }

    const mergeImages = async (doc: jsPDF, images: string[] | File[]) => {
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        let xOffset = 0;
        let yOffset = 0;
        for (const file of images) {
            let image;
            if (file instanceof File) {
                image = await processImage(URL.createObjectURL(file));
            } else {
                image = await processImage(file)
            }
            const pdfHeight = (image.height * width) / image.width;
            let tmpOffset = yOffset;
            if (tmpOffset + pdfHeight > height) {
                doc.addPage()
                yOffset = 0;
            }
            doc.addImage({imageData: image, x: xOffset, y: yOffset, width, height: pdfHeight})
            yOffset += pdfHeight;
        }
    }

    const mergePDFs = async (doc: jsPDF) => {
        const images = [];
        for (const file of files) {
            if (file.type !== 'application/pdf') continue;
            const pdfDoc = await PDFJS.getDocument({url: URL.createObjectURL(file)}).promise
            const canvas = document.createElement("canvas")
            for (let i = 0; i < pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i+1);
                const viewport = page.getViewport({ scale: 1 });
                const context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                images.push(canvas.toDataURL())
            }
            canvas.remove();
        }

        await mergeImages(doc, images)
        doc.save('mergedPdfs.pdf')
    }

    const createPdf = async () => {
        const doc = new jsPDF();
        if (fileTypeAccepted === 'application/pdf') {
            setIsOpened(true)
            await mergePDFs(doc);
            setIsOpened(false)
        } else {
            setIsOpened(true)
            await mergeImages(doc, files);
            doc.save('mergedImages.pdf')
            setIsOpened(false)
        }
    }

    const handleAddPdfsButton = () => {
        setFileTypeAccepted('application/pdf')
        if (!fileInputRef.current) return;
        fileInputRef.current.accept = 'application/pdf';
        fileInputRef.current.click()
    }

    const handleAddImagesButton = () => {
        setFileTypeAccepted('image/*')
        if (!fileInputRef.current) return;
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.click()
    }

    return (
        <div className="bg-red-300 w-full min-h-screen flex flex-col items-center text-gray-50">
            <h1 className="font-semibold text-5xl p-2 text-gray-50 mt-4">PDF Merger</h1>
            <div className="flex gap-2 mt-4">
                <button className="p-2 bg-gray-100 rounded shadow w-[120px] hover:bg-gray-300 text-black" onClick={handleAddPdfsButton}>Add pdfs to merge</button>
                <button className="p-2 bg-gray-100 rounded shadow w-[120px] hover:bg-gray-300 text-black" onClick={handleAddImagesButton}>Add images to merge</button>
            </div>
            <input ref={fileInputRef} hidden multiple type="file" onChange={handleFileChange}/>
            {files.length > 0 && <p className="text-2xl">Your selected files:</p>}
            <div className="flex flex-col gap-2 items-center">
                {files.map(file => {
                    return <p key={file.name}>{file.name} - {file.type}</p>
                })}
            </div>
            <button className="p-2 bg-gray-100 rounded shadow w-[120px] hover:bg-gray-300 text-black mt-2" onClick={handleMergeButton}>Merge</button>
            <span className="flex-1" />
            <Dialog as="div" className="relative z-10" open={isOpened} onClose={()=>{}} >
                <div className="fixed inset-0 flex items-center justify-center">
                    <Dialog.Panel className="flex justify-center items-center w-full h-full rounded bg-gray-500/50 shadow-xl">
                        <Spinner />
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
}

export default App;
