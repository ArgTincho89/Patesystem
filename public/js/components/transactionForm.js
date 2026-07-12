const TransactionForm = {
  async show(onSave) {
    const categories = await API.categories.list();
    let selectedType = 'expense';
    let selectedCategoryId = categories.length > 0 ? categories[0].id : null;

    const form = create('div');

    const typeSelector = create('div', { className: 'type-selector' });
    ['expense', 'income', 'refund'].forEach(type => {
      const labels = { expense: 'Gasto', income: 'Ingreso', refund: 'Reembolso' };
      const btn = create('button', {
        className: `type-btn ${type === selectedType ? 'active' : ''}`,
        textContent: labels[type],
        dataset: { type }
      });
      on(btn, 'click', () => {
        selectedType = type;
        $$('.type-btn', form).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCategoryVisibility();
      });
      typeSelector.appendChild(btn);
    });
    form.appendChild(typeSelector);

    const categoryGroup = create('div', { className: 'form-group' });
    const categoryLabel = create('label', { textContent: 'Categoría' });
    const categorySelect = create('select', { className: 'form-control' });
    categories.forEach(cat => {
      const opt = create('option', { value: cat.id, textContent: cat.nombre });
      categorySelect.appendChild(opt);
    });
    if (selectedCategoryId) categorySelect.value = selectedCategoryId;
    categoryGroup.appendChild(categoryLabel);
    categoryGroup.appendChild(categorySelect);
    form.appendChild(categoryGroup);

    function updateCategoryVisibility() {
      categoryGroup.style.display = (selectedType === 'income') ? 'none' : 'block';
    }
    updateCategoryVisibility();

    const titleGroup = create('div', { className: 'form-group' });
    titleGroup.appendChild(create('label', { textContent: 'Título' }));
    const titleInput = create('input', {
      className: 'form-control',
      type: 'text',
      placeholder: 'Ej: Supermercado, Salary...'
    });
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    const amountGroup = create('div', { className: 'form-group' });
    amountGroup.appendChild(create('label', { textContent: 'Monto (€)' }));
    const amountInput = create('input', {
      className: 'form-control',
      type: 'number',
      step: '0.01',
      min: '0.01',
      placeholder: '0.00'
    });
    amountGroup.appendChild(amountInput);
    form.appendChild(amountGroup);

    const dateGroup = create('div', { className: 'form-group' });
    dateGroup.appendChild(create('label', { textContent: 'Fecha' }));
    const dateInput = create('input', {
      className: 'form-control',
      type: 'date',
      value: getToday()
    });
    dateGroup.appendChild(dateInput);
    form.appendChild(dateGroup);

    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    const cancelBtn = create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    });
    const saveBtn = create('button', {
      className: 'btn btn-primary',
      textContent: 'Guardar'
    });
    on(saveBtn, 'click', async () => {
      const data = {
        tipo: selectedType,
        titulo: titleInput.value.trim(),
        monto: parseFloat(amountInput.value),
        fecha: dateInput.value
      };

      if (selectedType !== 'income') {
        data.categoryId = categorySelect.value;
      }

      if (!data.titulo) return showToast('El título es obligatorio', 'error');
      if (!data.monto || data.monto <= 0) return showToast('El monto debe ser positivo', 'error');

      try {
        await API.transactions.create(data);
        Modal.hide();
        showToast('Transacción guardada');
        if (onSave) onSave();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    Modal.show('Nueva transacción', form, { footer });
    titleInput.focus();
  }
};
