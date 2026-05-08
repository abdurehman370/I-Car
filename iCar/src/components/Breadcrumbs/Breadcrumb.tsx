

interface BreadcrumbProps {
  pageName: string;
}

const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[26px] font-bold leading-[30px] text-white opacity-95">
        {pageName}
      </h2>

      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <span className="font-medium text-gray-500">
              Dashboard /
            </span>
          </li>
          <li className="font-semibold text-cyan-400">{pageName}</li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
