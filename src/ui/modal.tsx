import { raw } from "hono/html"
import type { Child, FC } from "hono/jsx"

type ModalProps = {
  title: string
  id: string
  position: "topleft" | "top" | "topright" | "left" | "center" | "right" | "bottomleft" | "bottom" | "bottomright"
  children?: Child
}

export const Modal: FC<ModalProps> = ({ id, title, children, position }) => {
    const positionClass: Record<ModalProps["position"], string> = {
        topleft: "modal-top-start",
        top: "modal-top",
        topright: "modal-top-end",
        left: "modal-middle-start",
        center: "modal-middle",
        right: "modal-middle-end",
        bottomleft: "modal-bottom-start",
        bottom: "modal-bottom",
        bottomright: "modal-bottom-end",
    }

    return (
        <div id={id} className={`overlay modal ${positionClass[position]} overlay-open:opacity-100 hidden overlay-open:duration-300`} role="dialog" tabIndex={-1}>
            <div className="overlay-animation-target modal-dialog overlay-open:mt-0 overlay-open:duration-300 mt-12 transition-all">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3 className="modal-title">{ title }</h3>
                        <button type="button" className="btn btn-text btn-circle btn-sm absolute end-3 top-3" aria-label="Close" data-overlay={`#${id}`}>
                        <span className="icon-[tabler--x] size-4"></span>
                        </button>
                    </div>
                    <div className="modal-body">{ children }</div>
                    {/* <div className="modal-footer">
                        <button type="button" className="btn btn-soft btn-secondary" data-overlay={`#${id}`} >Close</button>
                        <button type="button" className="btn btn-primary">Save changes</button>
                    </div> */}
                </div>
            </div>
        </div>
    )
}
