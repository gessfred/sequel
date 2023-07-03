import React, { useState } from 'react'
import './Dropdown.css'

export function Dropdown({label, text, items, onSelect}) {
  return (
    <div class="dropdown">
      <span>{text}</span>
      <div class="dropdown-content">
        {items.map((item, k) => (
          <span onClick={() => onSelect && onSelect(item, k)} className='dropdown-item'>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
